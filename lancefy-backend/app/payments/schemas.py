from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class EscrowResponse(BaseModel):
    id: UUID
    milestone_id: UUID
    client_id: UUID
    freelancer_id: UUID
    amount: Decimal
    status: str
    held_at: datetime
    released_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FundMilestoneRequest(BaseModel):
    milestone_id: UUID
    amount: Decimal


class FundMilestoneQuoteResponse(BaseModel):
    milestone_id: UUID
    milestone_amount: Decimal
    estimated_gateway_fee: Decimal
    total_charge_amount: Decimal
    currency: str = "THB"


class TransactionResponse(BaseModel):
    id: UUID
    type: str
    status: str
    amount: Decimal
    net_amount: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EscrowItemSummary(BaseModel):
    id: UUID
    milestone_id: UUID
    client_id: UUID
    freelancer_id: UUID
    amount: Decimal
    net_payout_amount: Decimal
    currency: str
    status: str
    held_at: datetime
    released_at: Optional[datetime] = None
    project_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class FinanceSummaryResponse(BaseModel):
    total_earned: Decimal
    pending_escrow: Decimal
    total_charged: Decimal
    total_refunded: Decimal
    escrow_items: list[EscrowItemSummary]
    transactions: list[TransactionResponse]


class WebhookPayload(BaseModel):
    event: str
    data: dict


class PaymentSetupResponse(BaseModel):
    omise_enabled: bool
    public_key: Optional[str] = None
    livemode: bool = False


class SavedPaymentMethodResponse(BaseModel):
    id: UUID
    gateway_provider: str
    type: str
    brand: Optional[str] = None
    last4: str
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    country: Optional[str] = None
    is_default: bool
    status: str
    verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CreateSavedPaymentMethodRequest(BaseModel):
    token: str
    holder_name: Optional[str] = None
    set_as_default: bool = False


class PaymentMethodActionResponse(BaseModel):
    message: str
    payment_method: SavedPaymentMethodResponse


class OmiseRecipientResponse(BaseModel):
    id: UUID
    omise_recipient_id: str
    omise_bank_code: Optional[str] = None
    omise_account_last4: Optional[str] = None
    recipient_status: str
    verified_at: Optional[datetime] = None
    disabled_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PayoutAccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    bank_name: str
    bank_code: str
    account_name: str
    account_number_masked: str
    currency: str
    country: str
    consent_given: bool
    consent_given_at: Optional[datetime] = None
    status: str
    is_default: bool
    verified_at: Optional[datetime] = None
    disabled_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    omise_recipient: Optional[OmiseRecipientResponse] = None

    class Config:
        from_attributes = True


class UpsertPayoutAccountRequest(BaseModel):
    bank_name: str
    bank_code: str
    account_name: str
    account_number: Optional[str] = None
    consent_given: bool
    set_as_default: bool = True
