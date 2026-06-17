from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List


class DisputeOpenSchema(BaseModel):
    project_id: UUID
    milestone_id: Optional[UUID] = None
    reason: str
    reason_detail: Optional[str] = None


class EvidenceCreateSchema(BaseModel):
    type: str
    content: Optional[str] = None
    file_id: Optional[UUID] = None


class DisputeResolveSchema(BaseModel):
    resolution: str
    resolution_note: Optional[str] = None
    new_due_date: Optional[date] = None  # required when resolution = extend_deadline


class DisputeMarkStatusSchema(BaseModel):
    status: str  # "reviewing"


class EvidenceResponseSchema(BaseModel):
    id: UUID
    dispute_id: UUID
    submitted_by: UUID
    submitter_name: Optional[str] = None
    submitter_username: Optional[str] = None
    type: str
    content: Optional[str] = None
    file_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DisputeResponseSchema(BaseModel):
    id: UUID
    project_id: UUID
    project_title: Optional[str] = None
    milestone_id: Optional[UUID] = None
    milestone_title: Optional[str] = None
    raised_by: UUID
    raiser_name: Optional[str] = None
    raiser_username: Optional[str] = None
    reason: str
    reason_detail: Optional[str] = None
    status: str
    resolution: Optional[str] = None
    resolution_note: Optional[str] = None
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None
    new_due_date: Optional[date] = None
    created_at: datetime
    evidences: List[EvidenceResponseSchema] = []
    messages: List["DisputeMessageResponseSchema"] = []

    class Config:
        from_attributes = True


class DisputeMessageCreateSchema(BaseModel):
    content: str
    message_type: str = "info_reply"  # party ส่งมาเป็น info_reply เสมอ


class DisputeMessageResponseSchema(BaseModel):
    id: UUID
    dispute_id: UUID
    sender_id: UUID
    sender_name: Optional[str] = None
    sender_username: Optional[str] = None
    is_admin: bool = False
    message_type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


DisputeResponseSchema.model_rebuild()
