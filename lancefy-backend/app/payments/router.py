from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_platform_admin
from app.core.database import get_db
from app.payments import service
from app.payments.schemas import (
    CreateSavedPaymentMethodRequest,
    EscrowResponse,
    FinanceSummaryResponse,
    FundMilestoneRequest,
    FundMilestoneQuoteResponse,
    PaymentMethodActionResponse,
    PayoutAccountResponse,
    PaymentSetupResponse,
    SavedPaymentMethodResponse,
    TransactionResponse,
    UpsertPayoutAccountRequest,
)
from app.users.models import User

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/setup", response_model=PaymentSetupResponse)
def get_payment_setup(
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return service.get_payment_setup_payload()


@router.get("/methods", response_model=list[SavedPaymentMethodResponse])
def list_saved_payment_methods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_saved_payment_methods(db, user_id=current_user.id)


@router.post(
    "/methods/cards",
    response_model=PaymentMethodActionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_saved_payment_method(
    body: CreateSavedPaymentMethodRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment_method = service.create_saved_payment_method(
        db,
        user=current_user,
        token=body.token,
        holder_name=body.holder_name,
        set_as_default=body.set_as_default,
    )
    return {
        "message": "Payment method added successfully.",
        "payment_method": payment_method,
    }


@router.post("/methods/{payment_method_id}/default", response_model=PaymentMethodActionResponse)
def set_default_payment_method(
    payment_method_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment_method = service.set_default_payment_method(
        db,
        user_id=current_user.id,
        payment_method_id=payment_method_id,
    )
    return {
        "message": "Default payment method updated.",
        "payment_method": payment_method,
    }


@router.delete("/methods/{payment_method_id}", response_model=PaymentMethodActionResponse)
def delete_payment_method(
    payment_method_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment_method = service.delete_payment_method(
        db,
        user_id=current_user.id,
        payment_method_id=payment_method_id,
    )
    return {
        "message": "Payment method removed successfully.",
        "payment_method": payment_method,
    }


@router.get("/payout-account", response_model=PayoutAccountResponse | None)
def get_my_payout_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_payout_account(db, user=current_user)


@router.put("/payout-account", response_model=PayoutAccountResponse)
def upsert_my_payout_account(
    body: UpsertPayoutAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.upsert_payout_account(
        db,
        user=current_user,
        bank_name=body.bank_name,
        bank_code=body.bank_code,
        account_name=body.account_name,
        account_number=body.account_number,
        consent_given=body.consent_given,
        set_as_default=body.set_as_default,
    )


@router.get("/escrow/{milestone_id}/quote", response_model=FundMilestoneQuoteResponse)
def get_fund_milestone_quote(
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_fund_milestone_quote(
        db,
        milestone_id=milestone_id,
        client_id=current_user.id,
    )


@router.post("/escrow/fund", response_model=EscrowResponse, status_code=status.HTTP_201_CREATED)
def fund_milestone(
    body: FundMilestoneRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.fund_milestone(
        db,
        milestone_id=body.milestone_id,
        client_id=current_user.id,
        amount=body.amount,
    )


@router.post("/escrow/{milestone_id}/release", response_model=EscrowResponse)
def release_escrow(
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.release_escrow(db, milestone_id=milestone_id, released_by=current_user.id)


@router.post(
    "/escrow/{milestone_id}/refund",
    response_model=EscrowResponse,
    dependencies=[Depends(require_platform_admin)],
)
def refund_escrow(
    milestone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.refund_escrow(
        db,
        milestone_id=milestone_id,
        released_by=current_user.id,
        allow_non_client_actor=True,
    )


@router.get("/escrow/{milestone_id}", response_model=EscrowResponse)
def get_escrow(
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    escrow = service.get_escrow(db, milestone_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    allowed = {str(escrow.client_id), str(escrow.freelancer_id)}
    if str(current_user.id) not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")
    return escrow


@router.get("/summary", response_model=FinanceSummaryResponse)
def get_finance_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_finance_summary(db, user_id=current_user.id)


@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_transactions(db, user_id=current_user.id, skip=skip, limit=limit)


@router.post("/webhook/omise", status_code=status.HTTP_200_OK, include_in_schema=False)
async def omise_webhook(request: Request):
    body = await request.json()
    return {"received": True, "event": body.get("key")}
