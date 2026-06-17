"""
Payment Service
===============

This module currently supports two layers:
1. Saved payment methods for Omise-backed checkout setup
2. Existing mock escrow operations used elsewhere in the app
"""

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

import requests
from fastapi import HTTPException
from requests.auth import HTTPBasicAuth
from sqlalchemy.orm import Session

from app.core.config import settings
from app.payments.models import (
    EscrowHolding,
    EscrowStatus,
    OmiseRecipient,
    OmiseRecipientStatus,
    PaymentCustomer,
    PaymentMethod,
    PaymentMethodStatus,
    PaymentProvider,
    PayoutAccount,
    PayoutAccountStatus,
    PaymentTransaction,
    TransactionStatus,
    TransactionType,
)
from app.projects.models import Milestone, MilestoneFundingStatus
from app.users.models import KYCStatus, User
from app.notifications.models import Notification

OMISE_CARD_FEE_RATE = Decimal("0.0365")
THAI_VAT_RATE = Decimal("0.07")


def is_omise_enabled() -> bool:
    return bool(settings.OMISE_PUBLIC_KEY and settings.OMISE_SECRET_KEY)


def get_payment_setup_payload() -> dict:
    return {
        "omise_enabled": is_omise_enabled(),
        "public_key": settings.OMISE_PUBLIC_KEY if is_omise_enabled() else None,
        "livemode": settings.OMISE_LIVEMODE,
    }


def _ensure_omise_enabled() -> None:
    if not is_omise_enabled():
        raise HTTPException(
            status_code=503,
            detail="Payment gateway is not configured yet.",
        )


def _omise_request(method: str, path: str, data: Optional[dict] = None) -> dict:
    _ensure_omise_enabled()
    response = requests.request(
        method=method.upper(),
        url=f"{settings.OMISE_API_BASE.rstrip('/')}{path}",
        data=data,
        auth=HTTPBasicAuth(settings.OMISE_SECRET_KEY or "", ""),
        timeout=20,
    )
    if response.status_code >= 400:
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        detail = payload.get("message") or payload.get("code") or "Payment gateway request failed."
        raise HTTPException(status_code=502, detail=detail)
    return response.json()


def _is_gateway_resource_missing(exc: HTTPException) -> bool:
    detail = str(exc.detail or "").lower()
    return exc.status_code == 502 and "not found" in detail


def _list_omise_cards(customer_id: str) -> list[dict]:
    customer = _omise_request("GET", f"/customers/{customer_id}")
    cards = customer.get("cards", {}) if isinstance(customer, dict) else {}
    if isinstance(cards, dict) and isinstance(cards.get("data"), list):
        return cards["data"]

    card_list = _omise_request("GET", f"/customers/{customer_id}/cards")
    if isinstance(card_list, dict) and isinstance(card_list.get("data"), list):
        return card_list["data"]
    return []


def _sort_cards_desc(cards: list[dict]) -> list[dict]:
    return sorted(cards, key=lambda item: item.get("created_at") or "", reverse=True)


def _quantize_money(amount: Decimal) -> Decimal:
    return Decimal(amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _calculate_omise_card_fee(amount: Decimal) -> Decimal:
    base_fee = _quantize_money(amount * OMISE_CARD_FEE_RATE)
    vat = _quantize_money(base_fee * THAI_VAT_RATE)
    return _quantize_money(base_fee + vat)


def _build_funding_quote(*, milestone: Milestone) -> dict:
    milestone_amount = _normalize_money(Decimal(milestone.amount or 0))
    gross_amount = _quantize_money(
        milestone_amount / (Decimal("1.00") - (OMISE_CARD_FEE_RATE * (Decimal("1.00") + THAI_VAT_RATE)))
    )
    gateway_fee = _calculate_omise_card_fee(gross_amount)
    net_amount = _quantize_money(gross_amount - gateway_fee)
    while net_amount < milestone_amount:
        gross_amount = _quantize_money(gross_amount + Decimal("0.01"))
        gateway_fee = _calculate_omise_card_fee(gross_amount)
        net_amount = _quantize_money(gross_amount - gateway_fee)

    return {
        "milestone_id": milestone.id,
        "milestone_amount": milestone_amount,
        "estimated_gateway_fee": _quantize_money(gross_amount - milestone_amount),
        "total_charge_amount": gross_amount,
        "currency": "THB",
    }


def _sync_payment_customer(
    db: Session,
    *,
    user: User,
    payload: dict,
) -> PaymentCustomer:
    customer = (
        db.query(PaymentCustomer)
        .filter(PaymentCustomer.user_id == user.id)
        .first()
    )
    if not customer:
        customer = PaymentCustomer(user_id=user.id)
        db.add(customer)

    customer.gateway_provider = PaymentProvider.OMISE.value
    customer.gateway_customer_id = payload["id"]
    customer.email = payload.get("email") or user.email
    customer.default_currency = "THB"
    customer.livemode = bool(payload.get("livemode", settings.OMISE_LIVEMODE))
    customer.raw_payload = payload
    customer.updated_at = datetime.utcnow()
    db.flush()
    return customer


def _find_candidate_card(
    cards: list[dict],
    existing_gateway_ids: set[str],
) -> dict:
    for card in _sort_cards_desc(cards):
        card_id = card.get("id")
        if card_id and card_id not in existing_gateway_ids:
            return card
    if cards:
        return _sort_cards_desc(cards)[0]
    raise HTTPException(status_code=502, detail="Unable to identify the saved payment card.")


def _mask_or_fail(card: dict, holder_name: Optional[str] = None) -> dict:
    last4 = (
        card.get("last_digits")
        or card.get("last4")
        or card.get("last_digits")
    )
    if not last4:
        raise HTTPException(status_code=502, detail="Gateway card metadata is incomplete.")
    return {
        "brand": card.get("brand"),
        "last4": str(last4),
        "exp_month": card.get("expiration_month"),
        "exp_year": card.get("expiration_year"),
        "holder_name": holder_name or card.get("name"),
        "bank_name": card.get("bank"),
        "country": card.get("country"),
        "fingerprint": card.get("fingerprint"),
        "livemode": bool(card.get("livemode", settings.OMISE_LIVEMODE)),
        "payload": card,
    }


def _set_default_locally(
    db: Session,
    *,
    user_id: UUID,
    payment_method_id: UUID,
) -> PaymentMethod:
    methods = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.user_id == user_id,
            PaymentMethod.deleted_at.is_(None),
            PaymentMethod.status != PaymentMethodStatus.DELETED.value,
        )
        .all()
    )
    selected: Optional[PaymentMethod] = None
    for method in methods:
        is_selected = method.id == payment_method_id
        method.is_default = is_selected
        if is_selected:
            selected = method
    if not selected:
        raise HTTPException(status_code=404, detail="Payment method not found.")
    db.flush()
    return selected


def list_saved_payment_methods(db: Session, *, user_id: UUID) -> list[PaymentMethod]:
    return (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.user_id == user_id,
            PaymentMethod.deleted_at.is_(None),
            PaymentMethod.status != PaymentMethodStatus.DELETED.value,
        )
        .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
        .all()
    )


def create_saved_payment_method(
    db: Session,
    *,
    user: User,
    token: str,
    holder_name: Optional[str] = None,
    set_as_default: bool = False,
) -> PaymentMethod:
    existing_customer = (
        db.query(PaymentCustomer)
        .filter(PaymentCustomer.user_id == user.id)
        .first()
    )
    existing_gateway_ids = {
        row.gateway_payment_method_id
        for row in db.query(PaymentMethod.gateway_payment_method_id)
        .filter(PaymentMethod.user_id == user.id)
        .all()
    }

    if existing_customer:
        customer_payload = _omise_request(
            "PATCH",
            f"/customers/{existing_customer.gateway_customer_id}",
            {"card": token},
        )
        customer = _sync_payment_customer(db, user=user, payload=customer_payload)
    else:
        customer_payload = _omise_request(
            "POST",
            "/customers",
            {
                "email": user.email,
                "description": f"LanceFy user {user.id}",
                "card": token,
            },
        )
        customer = _sync_payment_customer(db, user=user, payload=customer_payload)

    cards = _list_omise_cards(customer.gateway_customer_id)
    gateway_card = _find_candidate_card(cards, existing_gateway_ids)
    masked = _mask_or_fail(gateway_card, holder_name=holder_name)

    payment_method = PaymentMethod(
        user_id=user.id,
        payment_customer_id=customer.id,
        gateway_provider=PaymentProvider.OMISE.value,
        type="card",
        gateway_payment_method_id=gateway_card["id"],
        brand=masked["brand"],
        last4=masked["last4"],
        exp_month=masked["exp_month"],
        exp_year=masked["exp_year"],
        holder_name=masked["holder_name"],
        bank_name=masked["bank_name"],
        country=masked["country"],
        is_default=False,
        reusable=True,
        status=PaymentMethodStatus.ACTIVE.value,
        fingerprint=masked["fingerprint"],
        verified_at=datetime.utcnow(),
        raw_payload=masked["payload"],
    )
    db.add(payment_method)
    db.flush()

    active_count = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.user_id == user.id,
            PaymentMethod.deleted_at.is_(None),
            PaymentMethod.status != PaymentMethodStatus.DELETED.value,
        )
        .count()
    )
    should_be_default = set_as_default or active_count == 1
    if should_be_default:
        set_default_payment_method(db, user_id=user.id, payment_method_id=payment_method.id)

    db.commit()
    db.refresh(payment_method)
    return payment_method


def set_default_payment_method(
    db: Session,
    *,
    user_id: UUID,
    payment_method_id: UUID,
) -> PaymentMethod:
    method = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.user_id == user_id,
            PaymentMethod.deleted_at.is_(None),
            PaymentMethod.status != PaymentMethodStatus.DELETED.value,
        )
        .first()
    )
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found.")

    customer = (
        db.query(PaymentCustomer)
        .filter(PaymentCustomer.id == method.payment_customer_id)
        .first()
    )
    if customer:
        customer_payload = _omise_request(
            "PATCH",
            f"/customers/{customer.gateway_customer_id}",
            {"default_card": method.gateway_payment_method_id},
        )
        _sync_payment_customer(db, user=method.user, payload=customer_payload)

    selected = _set_default_locally(db, user_id=user_id, payment_method_id=payment_method_id)
    db.commit()
    db.refresh(selected)
    return selected


def delete_payment_method(
    db: Session,
    *,
    user_id: UUID,
    payment_method_id: UUID,
) -> PaymentMethod:
    method = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.user_id == user_id,
            PaymentMethod.deleted_at.is_(None),
            PaymentMethod.status != PaymentMethodStatus.DELETED.value,
        )
        .first()
    )
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found.")

    customer = (
        db.query(PaymentCustomer)
        .filter(PaymentCustomer.id == method.payment_customer_id)
        .first()
    )
    if customer:
        try:
            _omise_request(
                "DELETE",
                f"/customers/{customer.gateway_customer_id}/cards/{method.gateway_payment_method_id}",
            )
        except HTTPException as exc:
            # If the gateway customer/card was already removed out-of-band,
            # still let the local saved method be cleaned up.
            if not _is_gateway_resource_missing(exc):
                raise

    method.deleted_at = datetime.utcnow()
    method.status = PaymentMethodStatus.DELETED.value
    method.is_default = False
    method.updated_at = datetime.utcnow()

    replacement = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.user_id == user_id,
            PaymentMethod.id != payment_method_id,
            PaymentMethod.deleted_at.is_(None),
            PaymentMethod.status != PaymentMethodStatus.DELETED.value,
        )
        .order_by(PaymentMethod.created_at.desc())
        .first()
    )
    if replacement:
        _set_default_locally(db, user_id=user_id, payment_method_id=replacement.id)
        if customer:
            _omise_request(
                "PATCH",
                f"/customers/{customer.gateway_customer_id}",
                {"default_card": replacement.gateway_payment_method_id},
            )

    db.commit()
    db.refresh(method)
    return method


def _parse_gateway_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone().replace(tzinfo=None)
    return parsed


def _normalize_bank_code(value: str) -> str:
    return (value or "").strip().lower()


def _normalize_account_number(value: Optional[str]) -> str:
    if not value:
        return ""
    return "".join(ch for ch in str(value).strip() if ch.isalnum())


def _get_default_payout_account(db: Session, *, user_id: UUID) -> Optional[PayoutAccount]:
    return (
        db.query(PayoutAccount)
        .filter(PayoutAccount.user_id == user_id)
        .order_by(PayoutAccount.is_default.desc(), PayoutAccount.created_at.desc())
        .first()
    )


def _set_default_payout_account(
    db: Session,
    *,
    user_id: UUID,
    payout_account_id: UUID,
) -> PayoutAccount:
    accounts = (
        db.query(PayoutAccount)
        .filter(PayoutAccount.user_id == user_id)
        .all()
    )
    selected: Optional[PayoutAccount] = None
    for account in accounts:
        is_selected = account.id == payout_account_id
        account.is_default = is_selected
        if is_selected:
            selected = account
    if not selected:
        raise HTTPException(status_code=404, detail="Payout account not found.")
    db.flush()
    return selected


def _recipient_failure_reason(payload: dict) -> Optional[str]:
    return (
        payload.get("failure_message")
        or payload.get("failure_code")
        or payload.get("failure_reason")
    )


def _derive_recipient_status(payload: dict) -> str:
    if payload.get("deleted"):
        return OmiseRecipientStatus.DISABLED.value

    if _recipient_failure_reason(payload):
        return OmiseRecipientStatus.FAILED.value

    active = bool(payload.get("active"))
    verified = bool(payload.get("verified"))

    if active and verified:
        return OmiseRecipientStatus.ACTIVE.value
    if verified and not active:
        return OmiseRecipientStatus.DISABLED.value
    return OmiseRecipientStatus.PENDING.value


def _sync_recipient_record(
    db: Session,
    *,
    payout_account: PayoutAccount,
    payload: dict,
) -> OmiseRecipient:
    recipient = payout_account.omise_recipient
    if not recipient:
        recipient = OmiseRecipient(
            payout_account_id=payout_account.id,
            omise_recipient_id=payload["id"],
            raw_payload={},
        )
        db.add(recipient)

    status = _derive_recipient_status(payload)
    bank_account = payload.get("bank_account") or {}
    now = datetime.utcnow()

    recipient.omise_recipient_id = payload["id"]
    recipient.omise_bank_code = (
        bank_account.get("brand")
        or bank_account.get("bank_code")
        or payout_account.bank_code
    )
    recipient.omise_account_last4 = bank_account.get("last_digits") or str(payout_account.account_number)[-4:]
    recipient.recipient_status = status
    recipient.failure_reason = _recipient_failure_reason(payload)
    recipient.raw_payload = payload
    recipient.last_synced_at = now
    recipient.updated_at = now

    verified_at = _parse_gateway_datetime(payload.get("verified_at")) or _parse_gateway_datetime(
        payload.get("activated_at")
    )
    if verified_at:
        recipient.verified_at = verified_at
    elif status == OmiseRecipientStatus.ACTIVE.value and not recipient.verified_at:
        recipient.verified_at = now

    if status == OmiseRecipientStatus.DISABLED.value:
        recipient.disabled_at = now
    else:
        recipient.disabled_at = None

    db.flush()
    return recipient


def _apply_payout_status(
    payout_account: PayoutAccount,
    *,
    user: User,
    recipient: Optional[OmiseRecipient],
) -> None:
    if user.kyc_status != KYCStatus.VERIFIED.value:
        payout_account.status = PayoutAccountStatus.PENDING_VERIFICATION.value
        payout_account.verified_at = None
        payout_account.disabled_at = None
        return

    if recipient is None:
        if is_omise_enabled():
            payout_account.status = (
                PayoutAccountStatus.REJECTED.value
                if payout_account.rejection_reason
                else PayoutAccountStatus.PENDING_VERIFICATION.value
            )
            payout_account.verified_at = None
        else:
            payout_account.status = PayoutAccountStatus.ACTIVE.value
            payout_account.verified_at = payout_account.verified_at or datetime.utcnow()
            payout_account.rejection_reason = None
        payout_account.disabled_at = None
        return

    if recipient.recipient_status == OmiseRecipientStatus.ACTIVE.value:
        payout_account.status = PayoutAccountStatus.ACTIVE.value
        payout_account.verified_at = recipient.verified_at or payout_account.verified_at or datetime.utcnow()
        payout_account.disabled_at = None
        payout_account.rejection_reason = None
        return

    if recipient.recipient_status == OmiseRecipientStatus.DISABLED.value:
        payout_account.status = PayoutAccountStatus.INACTIVE.value
        payout_account.disabled_at = recipient.disabled_at or datetime.utcnow()
        payout_account.rejection_reason = None
        return

    if recipient.recipient_status == OmiseRecipientStatus.FAILED.value:
        payout_account.status = PayoutAccountStatus.REJECTED.value
        payout_account.rejection_reason = recipient.failure_reason
        return

    payout_account.status = PayoutAccountStatus.PENDING_VERIFICATION.value
    payout_account.rejection_reason = None
    payout_account.disabled_at = None


def _build_recipient_payload(*, user: User, payout_account: PayoutAccount) -> dict:
    display_name = (
        payout_account.account_name
        or " ".join(part for part in [user.firstname, user.lastname] if part)
        or user.display_name
        or user.username
        or user.email
    )
    return {
        "name": display_name,
        "email": user.email,
        "description": f"LanceFy payout account {payout_account.id}",
        "type": "individual",
        "bank_account[brand]": payout_account.bank_code,
        "bank_account[number]": payout_account.account_number,
        "bank_account[name]": payout_account.account_name,
    }


def _upsert_gateway_recipient(
    db: Session,
    *,
    user: User,
    payout_account: PayoutAccount,
) -> OmiseRecipient:
    payload = _build_recipient_payload(user=user, payout_account=payout_account)
    existing = payout_account.omise_recipient

    if existing and existing.omise_recipient_id:
        response = _omise_request("PATCH", f"/recipients/{existing.omise_recipient_id}", payload)
    else:
        response = _omise_request("POST", "/recipients", payload)

    return _sync_recipient_record(db, payout_account=payout_account, payload=response)


def _refresh_gateway_recipient(
    db: Session,
    *,
    payout_account: PayoutAccount,
) -> Optional[OmiseRecipient]:
    existing = payout_account.omise_recipient
    if not existing or not is_omise_enabled():
        return existing

    try:
        response = _omise_request("GET", f"/recipients/{existing.omise_recipient_id}")
    except HTTPException as exc:
        if _is_gateway_resource_missing(exc):
            existing.recipient_status = OmiseRecipientStatus.FAILED.value
            existing.failure_reason = "Recipient not found in gateway."
            existing.last_synced_at = datetime.utcnow()
            db.flush()
            return existing
        raise

    return _sync_recipient_record(db, payout_account=payout_account, payload=response)


def _normalize_money(amount: Decimal) -> Decimal:
    return Decimal(amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _decimal_to_minor_units(amount: Decimal) -> int:
    normalized = _normalize_money(amount)
    if normalized <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
    return int((normalized * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))


def _minor_units_to_decimal(value: Optional[object], *, fallback: Decimal | None = None) -> Decimal:
    if value in (None, ""):
        if fallback is None:
            return Decimal("0.00")
        return _normalize_money(fallback)
    try:
        return _normalize_money(Decimal(str(value)) / Decimal("100"))
    except Exception:
        if fallback is None:
            return Decimal("0.00")
        return _normalize_money(fallback)


def _gateway_failure_reason(payload: dict) -> Optional[str]:
    return (
        payload.get("failure_message")
        or payload.get("failure_code")
        or payload.get("message")
        or payload.get("code")
    )


def _get_default_payment_method(db: Session, *, user_id: UUID) -> PaymentMethod:
    method = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.user_id == user_id,
            PaymentMethod.deleted_at.is_(None),
            PaymentMethod.status == PaymentMethodStatus.ACTIVE.value,
        )
        .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
        .first()
    )
    if not method:
        raise HTTPException(
            status_code=400,
            detail="Add a payment method before funding this milestone.",
        )
    return method


def _get_payment_customer_for_method(db: Session, *, method: PaymentMethod) -> PaymentCustomer:
    customer = (
        db.query(PaymentCustomer)
        .filter(PaymentCustomer.id == method.payment_customer_id)
        .first()
    )
    if not customer or not customer.gateway_customer_id:
        raise HTTPException(status_code=400, detail="Payment customer is not ready yet.")
    return customer


def _create_gateway_charge(
    *,
    customer: PaymentCustomer,
    method: PaymentMethod,
    amount: Decimal,
    milestone: Milestone,
) -> dict:
    payload = {
        "amount": _decimal_to_minor_units(amount),
        "currency": "thb",
        "customer": customer.gateway_customer_id,
        "card": method.gateway_payment_method_id,
        "capture": "true",
        "description": f"LanceFy milestone funding {milestone.id}",
        "metadata[milestone_id]": str(milestone.id),
    }
    if milestone.project_id:
        payload["metadata[project_id]"] = str(milestone.project_id)
    return _omise_request("POST", "/charges", payload)


def _create_gateway_transfer(
    *,
    recipient: OmiseRecipient,
    amount: Decimal,
    milestone: Milestone,
) -> dict:
    payload = {
        "amount": _decimal_to_minor_units(amount),
        "currency": "thb",
        "recipient": recipient.omise_recipient_id,
    }
    if milestone.project_id:
        payload["metadata[project_id]"] = str(milestone.project_id)
    payload["metadata[milestone_id]"] = str(milestone.id)
    return _omise_request("POST", "/transfers", payload)


def _create_gateway_refund(*, charge_tx: PaymentTransaction, amount: Decimal) -> dict:
    if charge_tx.gateway_provider != PaymentProvider.OMISE.value or not charge_tx.gateway_tx_id:
        raise HTTPException(
            status_code=400,
            detail="This escrow cannot be refunded through the configured gateway.",
        )
    payload = {"amount": _decimal_to_minor_units(amount)}
    return _omise_request("POST", f"/charges/{charge_tx.gateway_tx_id}/refunds", payload)


def _is_charge_successful(payload: dict) -> bool:
    status = str(payload.get("status") or "").lower()
    return status == "successful" and bool(payload.get("paid"))


def _derive_charge_tx_status(payload: dict) -> str:
    status = str(payload.get("status") or "").lower()
    if _is_charge_successful(payload):
        return TransactionStatus.SUCCEEDED.value
    if status in {"pending", "authorized"}:
        return TransactionStatus.PENDING.value
    if status == "reversed":
        return TransactionStatus.REVERSED.value
    return TransactionStatus.FAILED.value


def _derive_transfer_tx_status(payload: dict) -> str:
    if _gateway_failure_reason(payload):
        return TransactionStatus.FAILED.value
    if payload.get("paid") or payload.get("sent"):
        return TransactionStatus.SUCCEEDED.value
    return TransactionStatus.PENDING.value


def _derive_refund_tx_status(payload: dict) -> str:
    status = str(payload.get("status") or "").lower()
    if _gateway_failure_reason(payload):
        return TransactionStatus.FAILED.value
    if status == "pending":
        return TransactionStatus.PENDING.value
    return TransactionStatus.SUCCEEDED.value


def _record_gateway_tx(
    db: Session,
    *,
    user_id: UUID,
    tx_type: str,
    status: str,
    amount: Decimal,
    fee: Decimal,
    net_amount: Decimal,
    reference_type: str,
    reference_id: UUID,
    payload: dict,
    parent_transaction_id: Optional[UUID] = None,
) -> PaymentTransaction:
    tx = PaymentTransaction(
        gateway_provider=PaymentProvider.OMISE.value,
        gateway_tx_id=payload.get("id"),
        gateway_event_id=payload.get("transaction") if tx_type == TransactionType.CHARGE.value else None,
        raw_payload=payload,
        type=tx_type,
        status=status,
        failure_reason=_gateway_failure_reason(payload),
        amount=_normalize_money(amount),
        fee=_normalize_money(fee),
        net_amount=_normalize_money(net_amount),
        currency=str(payload.get("currency") or "thb").upper(),
        user_id=user_id,
        parent_transaction_id=parent_transaction_id,
        reference_type=reference_type,
        reference_id=reference_id,
        processed_at=datetime.utcnow(),
        gateway_created_at=_parse_gateway_datetime(payload.get("created_at")),
    )
    db.add(tx)
    db.flush()
    return tx


def get_payout_account(
    db: Session,
    *,
    user: User,
) -> Optional[PayoutAccount]:
    payout_account = _get_default_payout_account(db, user_id=user.id)
    if not payout_account:
        return None

    recipient = payout_account.omise_recipient
    if recipient and is_omise_enabled():
        try:
            recipient = _refresh_gateway_recipient(db, payout_account=payout_account)
        except HTTPException:
            # Keep the page usable even if the gateway is temporarily unavailable.
            recipient = payout_account.omise_recipient

    _apply_payout_status(payout_account, user=user, recipient=recipient)
    db.commit()
    db.refresh(payout_account)
    return payout_account


def upsert_payout_account(
    db: Session,
    *,
    user: User,
    bank_name: str,
    bank_code: str,
    account_name: str,
    account_number: Optional[str],
    consent_given: bool,
    set_as_default: bool = True,
) -> PayoutAccount:
    if not consent_given:
        raise HTTPException(status_code=422, detail="Consent is required before saving a payout account.")

    normalized_bank_name = (bank_name or "").strip()
    normalized_bank_code = _normalize_bank_code(bank_code)
    normalized_account_name = (account_name or "").strip()
    normalized_account_number = _normalize_account_number(account_number)

    if not normalized_bank_name or not normalized_bank_code or not normalized_account_name:
        raise HTTPException(status_code=422, detail="Bank, bank code, and account name are required.")

    payout_account = _get_default_payout_account(db, user_id=user.id)
    is_new = payout_account is None

    if not payout_account:
        if not normalized_account_number:
            raise HTTPException(status_code=422, detail="Account number is required.")
        payout_account = PayoutAccount(
            user_id=user.id,
            bank_name=normalized_bank_name,
            bank_code=normalized_bank_code,
            account_name=normalized_account_name,
            account_number=normalized_account_number,
            currency="THB",
            country="TH",
            consent_given=True,
            consent_given_at=datetime.utcnow(),
            is_default=True,
            status=PayoutAccountStatus.PENDING_VERIFICATION.value,
        )
        db.add(payout_account)
        db.flush()
    else:
        if normalized_account_number:
            payout_account.account_number = normalized_account_number
        payout_account.bank_name = normalized_bank_name
        payout_account.bank_code = normalized_bank_code
        payout_account.account_name = normalized_account_name
        payout_account.consent_given = True
        payout_account.consent_given_at = payout_account.consent_given_at or datetime.utcnow()
        payout_account.updated_at = datetime.utcnow()
        payout_account.rejection_reason = None
        payout_account.disabled_at = None

    if set_as_default or is_new:
        _set_default_payout_account(db, user_id=user.id, payout_account_id=payout_account.id)

    recipient = payout_account.omise_recipient
    if user.kyc_status == KYCStatus.VERIFIED.value and is_omise_enabled():
        try:
            recipient = _upsert_gateway_recipient(db, user=user, payout_account=payout_account)
        except HTTPException as exc:
            payout_account.status = PayoutAccountStatus.REJECTED.value
            payout_account.rejection_reason = str(exc.detail)
            if payout_account.omise_recipient:
                payout_account.omise_recipient.recipient_status = OmiseRecipientStatus.FAILED.value
                payout_account.omise_recipient.failure_reason = str(exc.detail)
                payout_account.omise_recipient.last_synced_at = datetime.utcnow()
    else:
        payout_account.status = PayoutAccountStatus.PENDING_VERIFICATION.value
        payout_account.verified_at = None

    _apply_payout_status(payout_account, user=user, recipient=recipient)
    db.commit()
    db.refresh(payout_account)
    return payout_account


def _create_mock_tx(
    db: Session,
    user_id: UUID,
    tx_type: str,
    amount: Decimal,
    reference_type: str,
    reference_id: UUID,
) -> PaymentTransaction:
    net_amount = amount
    tx = PaymentTransaction(
        gateway_provider=PaymentProvider.MANUAL.value,
        gateway_tx_id=None,
        raw_payload={},
        type=tx_type,
        status=TransactionStatus.SUCCEEDED.value,
        amount=amount,
        fee=Decimal("0"),
        net_amount=net_amount,
        currency="THB",
        user_id=user_id,
        reference_type=reference_type,
        reference_id=reference_id,
        processed_at=datetime.utcnow(),
    )
    db.add(tx)
    db.flush()
    return tx


def get_fund_milestone_quote(
    db: Session,
    milestone_id: UUID,
    client_id: UUID,
) -> dict:
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    project = milestone.project
    if str(project.client_id) != str(client_id):
        raise HTTPException(status_code=403, detail="Not the client of this project")
    if milestone.amount is None:
        raise HTTPException(status_code=400, detail="Milestone amount is missing.")

    return _build_funding_quote(milestone=milestone)


def fund_milestone(
    db: Session,
    milestone_id: UUID,
    client_id: UUID,
    amount: Decimal,
) -> EscrowHolding:
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if milestone.funding_status == MilestoneFundingStatus.FUNDED:
        raise HTTPException(status_code=409, detail="Milestone already funded")

    project = milestone.project
    if str(project.client_id) != str(client_id):
        raise HTTPException(status_code=403, detail="Not the client of this project")
    normalized_amount = _normalize_money(amount)
    if milestone.amount is not None:
        milestone_amount = _normalize_money(Decimal(milestone.amount))
        if milestone_amount != normalized_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Funding amount must match the milestone amount ({milestone_amount}).",
            )
    else:
        raise HTTPException(status_code=400, detail="Milestone amount is missing.")

    funding_quote = _build_funding_quote(milestone=milestone)

    payment_method = _get_default_payment_method(db, user_id=client_id)
    payment_customer = _get_payment_customer_for_method(db, method=payment_method)
    charge_payload = _create_gateway_charge(
        customer=payment_customer,
        method=payment_method,
        amount=funding_quote["total_charge_amount"],
        milestone=milestone,
    )
    if not _is_charge_successful(charge_payload):
        raise HTTPException(
            status_code=400,
            detail=_gateway_failure_reason(charge_payload)
            or "The payment charge was not completed successfully.",
        )

    charge_amount = _minor_units_to_decimal(
        charge_payload.get("amount"),
        fallback=funding_quote["total_charge_amount"],
    )
    charge_fee = _minor_units_to_decimal(charge_payload.get("fee"))
    charge_net = _minor_units_to_decimal(
        charge_payload.get("net"),
        fallback=charge_amount - charge_fee,
    )
    charge_tx = _record_gateway_tx(
        db,
        user_id=client_id,
        tx_type=TransactionType.CHARGE.value,
        status=_derive_charge_tx_status(charge_payload),
        amount=charge_amount,
        fee=charge_fee,
        net_amount=charge_net,
        reference_type="milestone",
        reference_id=milestone_id,
        payload=charge_payload,
    )

    escrow_amount = funding_quote["milestone_amount"]
    escrow = EscrowHolding(
        project_id=project.id,
        milestone_id=milestone_id,
        client_id=project.client_id,
        freelancer_id=project.freelancer_id,
        amount=escrow_amount,
        platform_fee_amount=Decimal("0"),
        net_payout_amount=escrow_amount,
        currency="THB",
        status=EscrowStatus.HELD.value,
        charge_tx_id=charge_tx.id,
        last_status_changed_at=datetime.utcnow(),
    )
    db.add(escrow)

    milestone.funding_status = MilestoneFundingStatus.FUNDED
    milestone.funded_at = datetime.utcnow()

    db.add(Notification(
        user_id=project.freelancer_id,
        actor_id=project.client_id,
        type="payment_funded",
        title="Escrow วางแล้ว",
        body=f"Milestone '{milestone.title}' มีการวาง Escrow เรียบร้อยแล้ว",
        reference_type="project",
        reference_id=str(project.id),
        is_read=False,
        created_at=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(escrow)
    return escrow


def release_escrow(
    db: Session,
    milestone_id: UUID,
    released_by: Optional[UUID] = None,
    allow_non_client_actor: bool = False,
) -> EscrowHolding:
    escrow = db.query(EscrowHolding).filter(EscrowHolding.milestone_id == milestone_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    if escrow.status != EscrowStatus.HELD.value:
        raise HTTPException(status_code=400, detail=f"Escrow is already {escrow.status}")
    if released_by and not allow_non_client_actor and str(released_by) != str(escrow.client_id):
        raise HTTPException(status_code=403, detail="Only the client can release escrow")

    payout_account = _get_default_payout_account(db, user_id=escrow.freelancer_id)
    if payout_account:
        recipient = payout_account.omise_recipient
        if recipient and is_omise_enabled():
            try:
                recipient = _refresh_gateway_recipient(db, payout_account=payout_account)
            except HTTPException:
                recipient = payout_account.omise_recipient
        payout_account.last_used_at = datetime.utcnow()
        escrow.payout_account_id = payout_account.id
        escrow.omise_recipient_ref_id = recipient.id if recipient else None
    else:
        recipient = None

    if not payout_account or not recipient:
        raise HTTPException(
            status_code=400,
            detail="The freelancer does not have a payout recipient ready yet.",
        )

    if recipient.recipient_status != OmiseRecipientStatus.ACTIVE.value:
        raise HTTPException(
            status_code=400,
            detail="The freelancer payout recipient is not active yet.",
        )

    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    transfer_payload = _create_gateway_transfer(
        recipient=recipient,
        amount=Decimal(escrow.net_payout_amount),
        milestone=milestone or escrow.milestone,
    )
    transfer_amount = _minor_units_to_decimal(
        transfer_payload.get("amount"),
        fallback=Decimal(escrow.net_payout_amount),
    )
    transfer_fee = _minor_units_to_decimal(
        transfer_payload.get("fee") or transfer_payload.get("total_fee"),
    )
    transfer_net = _minor_units_to_decimal(
        transfer_payload.get("net"),
        fallback=transfer_amount - transfer_fee,
    )
    release_tx = _record_gateway_tx(
        db,
        user_id=escrow.freelancer_id,
        tx_type=TransactionType.TRANSFER.value,
        status=_derive_transfer_tx_status(transfer_payload),
        amount=transfer_amount,
        fee=transfer_fee,
        net_amount=transfer_net,
        reference_type="milestone",
        reference_id=milestone_id,
        payload=transfer_payload,
        parent_transaction_id=escrow.charge_tx_id,
    )
    if release_tx.status == TransactionStatus.FAILED.value:
        raise HTTPException(
            status_code=400,
            detail=release_tx.failure_reason or "The payout transfer failed.",
        )

    escrow.status = EscrowStatus.RELEASED.value
    escrow.release_tx_id = release_tx.id
    escrow.released_at = datetime.utcnow()
    escrow.released_by = released_by
    escrow.last_status_changed_at = datetime.utcnow()

    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if milestone:
        milestone.funding_status = MilestoneFundingStatus.RELEASED

    db.add(Notification(
        user_id=escrow.freelancer_id,
        actor_id=released_by,
        type="payment_released",
        title="เงินถูกโอนแล้ว",
        body=f"Escrow สำหรับ milestone ถูกปล่อยเรียบร้อยแล้ว",
        reference_type="project",
        reference_id=str(escrow.project_id),
        is_read=False,
        created_at=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(escrow)
    return escrow


def refund_escrow(
    db: Session,
    milestone_id: UUID,
    released_by: Optional[UUID] = None,
    allow_non_client_actor: bool = False,
) -> EscrowHolding:
    escrow = db.query(EscrowHolding).filter(EscrowHolding.milestone_id == milestone_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    if escrow.status != EscrowStatus.HELD.value:
        raise HTTPException(status_code=400, detail=f"Escrow is already {escrow.status}")
    if released_by and not allow_non_client_actor and str(released_by) != str(escrow.client_id):
        raise HTTPException(status_code=403, detail="Only the client can refund escrow")
    if not escrow.charge_tx:
        raise HTTPException(status_code=400, detail="Funding charge record is missing.")

    refund_payload = _create_gateway_refund(
        charge_tx=escrow.charge_tx,
        amount=Decimal(escrow.amount),
    )
    refund_amount = _minor_units_to_decimal(refund_payload.get("amount"), fallback=Decimal(escrow.amount))
    refund_tx = _record_gateway_tx(
        db,
        user_id=escrow.client_id,
        tx_type=TransactionType.REFUND.value,
        status=_derive_refund_tx_status(refund_payload),
        amount=refund_amount,
        fee=Decimal("0.00"),
        net_amount=refund_amount,
        reference_type="milestone",
        reference_id=milestone_id,
        payload=refund_payload,
        parent_transaction_id=escrow.charge_tx_id,
    )
    if refund_tx.status == TransactionStatus.FAILED.value:
        raise HTTPException(
            status_code=400,
            detail=refund_tx.failure_reason or "The refund failed.",
        )

    escrow.status = EscrowStatus.REFUNDED.value
    escrow.release_tx_id = refund_tx.id
    escrow.released_at = datetime.utcnow()
    escrow.released_by = released_by
    escrow.last_status_changed_at = datetime.utcnow()

    # Fix: update milestone funding_status on refund (same as release_escrow does)
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if milestone:
        milestone.funding_status = MilestoneFundingStatus.REFUNDED

    db.add(Notification(
        user_id=escrow.client_id,
        actor_id=released_by,
        type="payment_released",
        title="คืนเงินแล้ว",
        body="Escrow ถูกคืนเข้า Wallet ของคุณแล้ว",
        reference_type="project",
        reference_id=str(escrow.project_id),
        is_read=False,
        created_at=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(escrow)
    return escrow


def get_escrow(db: Session, milestone_id: UUID) -> Optional[EscrowHolding]:
    return db.query(EscrowHolding).filter(EscrowHolding.milestone_id == milestone_id).first()


def list_transactions(
    db: Session,
    user_id: UUID,
    skip: int = 0,
    limit: int = 20,
) -> list[PaymentTransaction]:
    return (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.user_id == user_id)
        .order_by(PaymentTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_finance_summary(db: Session, user_id: UUID) -> dict:
    from sqlalchemy import func, or_

    total_earned = (
        db.query(func.coalesce(func.sum(PaymentTransaction.net_amount), 0))
        .filter(
            PaymentTransaction.user_id == user_id,
            PaymentTransaction.type == TransactionType.TRANSFER.value,
            PaymentTransaction.status.in_(
                [
                    TransactionStatus.PENDING.value,
                    TransactionStatus.SUCCEEDED.value,
                ]
            ),
        )
        .scalar()
        or Decimal("0")
    )

    pending_escrow = (
        db.query(func.coalesce(func.sum(EscrowHolding.amount), 0))
        .filter(
            EscrowHolding.freelancer_id == user_id,
            EscrowHolding.status == EscrowStatus.HELD.value,
        )
        .scalar()
        or Decimal("0")
    )

    total_charged = (
        db.query(func.coalesce(func.sum(PaymentTransaction.amount), 0))
        .filter(
            PaymentTransaction.user_id == user_id,
            PaymentTransaction.type == TransactionType.CHARGE.value,
            PaymentTransaction.status.in_(
                [
                    TransactionStatus.PENDING.value,
                    TransactionStatus.SUCCEEDED.value,
                ]
            ),
        )
        .scalar()
        or Decimal("0")
    )

    total_refunded = (
        db.query(func.coalesce(func.sum(PaymentTransaction.net_amount), 0))
        .filter(
            PaymentTransaction.user_id == user_id,
            PaymentTransaction.type == TransactionType.REFUND.value,
            PaymentTransaction.status == TransactionStatus.SUCCEEDED.value,
        )
        .scalar()
        or Decimal("0")
    )

    escrow_items = (
        db.query(EscrowHolding)
        .filter(
            or_(
                EscrowHolding.freelancer_id == user_id,
                EscrowHolding.client_id == user_id,
            )
        )
        .order_by(EscrowHolding.held_at.desc())
        .all()
    )

    transactions = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.user_id == user_id)
        .order_by(PaymentTransaction.created_at.desc())
        .limit(100)
        .all()
    )

    return {
        "total_earned": total_earned,
        "pending_escrow": pending_escrow,
        "total_charged": total_charged,
        "total_refunded": total_refunded,
        "escrow_items": escrow_items,
        "transactions": transactions,
    }
