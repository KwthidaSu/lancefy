"""
Payment models for an escrow-style marketplace.

Design goals:
- Keep immutable gateway/webhook events in `payment_transactions`
- Track business-level escrow state in `escrow_holdings`
- Store freelancer payout destinations in `payout_accounts`
- Keep Omise-specific recipient mapping in `omise_recipients`
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PaymentProvider(str, enum.Enum):
    OMISE = "omise"
    STRIPE = "stripe"
    PROMPTPAY = "promptpay"
    MANUAL = "manual"


class TransactionType(str, enum.Enum):
    CHARGE = "charge"
    TRANSFER = "transfer"
    REFUND = "refund"
    REVERSAL = "reversal"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REVERSED = "reversed"


class EscrowStatus(str, enum.Enum):
    HELD = "held"
    RELEASED = "released"
    REFUNDED = "refunded"


class PayoutAccountStatus(str, enum.Enum):
    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    INACTIVE = "inactive"
    REJECTED = "rejected"


class OmiseRecipientStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DISABLED = "disabled"
    FAILED = "failed"


class PaymentMethodStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    DELETED = "deleted"


class PaymentTransaction(Base):
    """
    Immutable gateway transaction/event ledger.

    One row represents one meaningful payment event recorded from the gateway
    or from a trusted internal reconciliation step. This table should be
    append-only in practice.
    """

    __tablename__ = "payment_transactions"
    __table_args__ = (
        UniqueConstraint("gateway_provider", "gateway_tx_id", name="uq_gateway_tx"),
        Index("ix_payment_tx_user_created", "user_id", "created_at"),
        Index("ix_payment_tx_reference", "reference_type", "reference_id"),
        Index("ix_payment_tx_status", "status"),
        Index("ix_payment_tx_type", "type"),
        Index("ix_payment_tx_event_id", "gateway_event_id"),
        Index("ix_payment_tx_idempotency", "idempotency_key"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    gateway_provider = Column(
        String(20),
        nullable=False,
        comment="omise | stripe | promptpay | manual",
    )
    gateway_tx_id = Column(
        String(255),
        nullable=True,
        comment="Gateway transaction id such as charge / transfer / refund id",
    )
    gateway_event_id = Column(
        String(255),
        nullable=True,
        comment="Webhook event id from the payment gateway",
    )
    idempotency_key = Column(
        String(255),
        nullable=True,
        comment="Application-level idempotency key for safe retries",
    )
    raw_payload = Column(
        JSONB,
        default=dict,
        nullable=False,
        comment="Full webhook or gateway payload for audit and reconciliation",
    )

    type = Column(
        String(20),
        nullable=False,
        comment="charge | transfer | refund | reversal",
    )
    status = Column(
        String(20),
        nullable=False,
        default=TransactionStatus.PENDING.value,
    )
    failure_reason = Column(Text, nullable=True)

    amount = Column(Numeric(12, 2), nullable=False)
    fee = Column(
        Numeric(12, 2),
        default=0,
        nullable=False,
        comment="Gateway fee or platform fee charged on this transaction",
    )
    net_amount = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Net amount after fees",
    )
    currency = Column(
        String(3),
        nullable=False,
        default="THB",
        comment="ISO currency code",
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Primary owner of this transaction record",
    )
    parent_transaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payment_transactions.id", ondelete="SET NULL"),
        nullable=True,
        comment="Original transaction for refunds or reversals",
    )

    reference_type = Column(
        String(30),
        nullable=True,
        comment="milestone | project | dispute | payout_account",
    )
    reference_id = Column(UUID(as_uuid=True), nullable=True)

    processed_at = Column(
        DateTime,
        nullable=True,
        comment="When our system finished processing this event",
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    gateway_created_at = Column(
        DateTime,
        nullable=True,
        comment="When the gateway created the underlying transaction",
    )

    user = relationship("User", foreign_keys=[user_id])
    parent_transaction = relationship(
        "PaymentTransaction",
        remote_side=[id],
        foreign_keys=[parent_transaction_id],
    )


class PaymentCustomer(Base):
    """
    Gateway customer profile for storing reusable payment methods.

    This record maps a platform user to a reusable customer object managed by
    Omise. Sensitive card data remains with the gateway.
    """

    __tablename__ = "payment_customers"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_payment_customer_user"),
        UniqueConstraint("gateway_provider", "gateway_customer_id", name="uq_payment_customer_gateway"),
        Index("ix_payment_customer_provider", "gateway_provider"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    gateway_provider = Column(
        String(20),
        nullable=False,
        default=PaymentProvider.OMISE.value,
        comment="omise | stripe | promptpay | manual",
    )
    gateway_customer_id = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    default_currency = Column(String(3), nullable=False, default="THB")
    livemode = Column(Boolean, nullable=False, default=False)
    raw_payload = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])
    payment_methods = relationship(
        "PaymentMethod",
        back_populates="payment_customer",
        cascade="all, delete-orphan",
    )


class PaymentMethod(Base):
    """
    Saved reusable payment method metadata.

    Only gateway references and masked card attributes are stored here.
    Full card details must never be stored in our database.
    """

    __tablename__ = "payment_methods"
    __table_args__ = (
        UniqueConstraint(
            "gateway_provider",
            "gateway_payment_method_id",
            name="uq_payment_method_gateway_ref",
        ),
        Index("ix_payment_methods_user", "user_id"),
        Index("ix_payment_methods_status", "status"),
        Index("ix_payment_methods_default", "user_id", "is_default"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    payment_customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payment_customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    gateway_provider = Column(
        String(20),
        nullable=False,
        default=PaymentProvider.OMISE.value,
        comment="omise | stripe | promptpay | manual",
    )
    type = Column(String(20), nullable=False, default="card")
    gateway_payment_method_id = Column(String(255), nullable=False)
    brand = Column(String(50), nullable=True)
    last4 = Column(String(4), nullable=False)
    exp_month = Column(Integer, nullable=True)
    exp_year = Column(Integer, nullable=True)
    holder_name = Column(String(255), nullable=True)
    bank_name = Column(String(120), nullable=True)
    country = Column(String(2), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    reusable = Column(Boolean, nullable=False, default=True)
    status = Column(
        String(32),
        nullable=False,
        default=PaymentMethodStatus.ACTIVE.value,
        comment="active | inactive | expired | deleted",
    )
    fingerprint = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    raw_payload = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])
    payment_customer = relationship("PaymentCustomer", back_populates="payment_methods")


class PayoutAccount(Base):
    """
    Platform-owned payout destination for a freelancer.

    This is the system-of-record for the bank destination the platform intends
    to pay to. Gateway-specific recipient mapping is stored separately.
    """

    __tablename__ = "payout_accounts"
    __table_args__ = (
        Index("ix_payout_accounts_user", "user_id"),
        Index("ix_payout_accounts_status", "status"),
        Index("ix_payout_accounts_default", "user_id", "is_default"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    bank_name = Column(String(120), nullable=False)
    bank_code = Column(String(50), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_number = Column(String(64), nullable=False)
    currency = Column(String(3), nullable=False, default="THB")
    country = Column(String(2), nullable=False, default="TH")

    consent_given = Column(Boolean, nullable=False, default=False)
    consent_given_at = Column(DateTime, nullable=True)

    status = Column(
        String(32),
        nullable=False,
        default=PayoutAccountStatus.PENDING_VERIFICATION.value,
        comment="pending_verification | active | inactive | rejected",
    )
    is_default = Column(Boolean, nullable=False, default=False)
    verified_at = Column(DateTime, nullable=True)
    disabled_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    last_used_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])
    omise_recipient = relationship(
        "OmiseRecipient",
        back_populates="payout_account",
        uselist=False,
    )

    @property
    def account_number_masked(self) -> str:
        if not self.account_number:
            return "****"
        return f"****{str(self.account_number)[-4:]}"


class OmiseRecipient(Base):
    """
    Mapping from our payout account to Omise recipient.

    This keeps gateway-specific state out of the domain-level payout account.
    """

    __tablename__ = "omise_recipients"
    __table_args__ = (
        UniqueConstraint("payout_account_id", name="uq_omise_recipient_payout_account"),
        UniqueConstraint("omise_recipient_id", name="uq_omise_recipient_id"),
        Index("ix_omise_recipient_status", "recipient_status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payout_account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payout_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )

    omise_recipient_id = Column(String(255), nullable=False)
    omise_bank_code = Column(String(50), nullable=True)
    omise_account_last4 = Column(String(4), nullable=True)
    recipient_status = Column(
        String(32),
        nullable=False,
        default=OmiseRecipientStatus.PENDING.value,
        comment="pending | active | disabled | failed",
    )
    verified_at = Column(DateTime, nullable=True)
    disabled_at = Column(DateTime, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    failure_reason = Column(Text, nullable=True)
    raw_payload = Column(
        JSONB,
        default=dict,
        nullable=False,
        comment="Latest Omise recipient payload snapshot",
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    payout_account = relationship("PayoutAccount", back_populates="omise_recipient")


class EscrowHolding(Base):
    """
    Business-level escrow state for one milestone.

    This tracks whether money for a milestone is currently held, released to
    the freelancer, or refunded back to the client.
    """

    __tablename__ = "escrow_holdings"
    __table_args__ = (
        UniqueConstraint("milestone_id", name="uq_escrow_milestone"),
        Index("ix_escrow_status", "status"),
        Index("ix_escrow_client", "client_id"),
        Index("ix_escrow_freelancer", "freelancer_id"),
        Index("ix_escrow_project", "project_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    milestone_id = Column(
        UUID(as_uuid=True),
        ForeignKey("milestones.id"),
        nullable=False,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="Client funding the milestone",
    )
    freelancer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="Freelancer receiving the payout after release",
    )
    payout_account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payout_accounts.id", ondelete="SET NULL"),
        nullable=True,
        comment="Selected payout account at the time of release planning",
    )
    omise_recipient_ref_id = Column(
        UUID(as_uuid=True),
        ForeignKey("omise_recipients.id", ondelete="SET NULL"),
        nullable=True,
        comment="Resolved Omise recipient used for payout",
    )

    amount = Column(Numeric(12, 2), nullable=False)
    platform_fee_amount = Column(Numeric(12, 2), nullable=False, default=0)
    net_payout_amount = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="THB")
    status = Column(
        String(20),
        default=EscrowStatus.HELD.value,
        nullable=False,
    )

    charge_tx_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payment_transactions.id"),
        nullable=False,
        comment="Funding transaction from the client",
    )
    release_tx_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payment_transactions.id"),
        nullable=True,
        comment="Settlement transaction for transfer or refund",
    )

    held_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    released_at = Column(DateTime, nullable=True)
    released_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="Admin user id for manual release or refund",
    )
    auto_release_at = Column(DateTime, nullable=True)
    last_status_changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", foreign_keys=[project_id])
    milestone = relationship("Milestone", foreign_keys=[milestone_id])
    client = relationship("User", foreign_keys=[client_id])
    freelancer = relationship("User", foreign_keys=[freelancer_id])
    payout_account = relationship("PayoutAccount", foreign_keys=[payout_account_id])
    omise_recipient = relationship("OmiseRecipient", foreign_keys=[omise_recipient_ref_id])
    charge_tx = relationship("PaymentTransaction", foreign_keys=[charge_tx_id])
    release_tx = relationship("PaymentTransaction", foreign_keys=[release_tx_id])
    admin = relationship("User", foreign_keys=[released_by])
