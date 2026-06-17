from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from enum import Enum


class KYCStatusEnum(str, Enum):
    NOT_SUBMITTED = "NOT_SUBMITTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_RESUBMISSION = "NEEDS_RESUBMISSION"


class KYCSubmitSchema(BaseModel):
    full_name: str
    citizen_id: str
    date_of_birth: date
    country: str
    address: str


class KYCProfileResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    citizen_id: str
    date_of_birth: date
    country: str
    address: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KYCDocumentSchema(BaseModel):
    file_id: UUID
    url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KYCDocumentUploadResponseSchema(BaseModel):
    message: str
    file_id: UUID
    url: str


class KYCStatusResponseSchema(BaseModel):
    status: KYCStatusEnum
    reason: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None


class KYCReviewSchema(BaseModel):
    status: KYCStatusEnum
    reason: Optional[str] = None


class KYCListItemSchema(BaseModel):
    user_id: UUID
    full_name: str
    email: Optional[str] = None
    citizen_id: str
    status: KYCStatusEnum
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KYCTimelineItemSchema(BaseModel):
    id: UUID
    event_type: str
    actor_type: str
    actor_name: Optional[str] = None
    note: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime


class KYCDetailSchema(BaseModel):
    user_id: UUID
    email: Optional[str] = None
    profile: KYCProfileResponseSchema
    id_card: Optional[KYCDocumentSchema] = None
    selfie: Optional[KYCDocumentSchema] = None
    status: KYCStatusEnum
    reason: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    timeline: List[KYCTimelineItemSchema] = []


class PaginatedKYCResponse(BaseModel):
    data: List[KYCListItemSchema]
    total: int
    page: int
    page_size: int
