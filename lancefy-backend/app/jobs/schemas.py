from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

from app.jobs.models import JobType, JobStatus, ProposalStatus
from app.skills.schemas import CategorySimpleResponse, SubcategorySimpleResponse, SkillResponse


# ─────────────────────────────────────────────────────────────────
# Job Schemas
# ─────────────────────────────────────────────────────────────────

class JobOwnerResponse(BaseModel):
    id: UUID
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class CreateJobRequest(BaseModel):
    job_type: JobType = JobType.HIRE
    title: str = Field(..., min_length=5, max_length=255)
    description: Optional[str] = None
    budget: Optional[Decimal] = Field(None, ge=0)
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
    skill_ids: list[UUID] = []
    tags: list[str] = []
    images: list[str] = []
    expires_at: Optional[datetime] = None
    delivery_date: Optional[date] = None


class UpdateJobRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = None
    budget: Optional[Decimal] = Field(None, ge=0)
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
    skill_ids: Optional[list[UUID]] = None
    tags: Optional[list[str]] = None
    images: Optional[list[str]] = None
    expires_at: Optional[datetime] = None
    delivery_date: Optional[date] = None


class JobResponse(BaseModel):
    id: UUID
    job_type: str
    title: str
    description: Optional[str] = None
    budget: Optional[Decimal] = None
    status: str
    images: list[str] = []
    tags: list[str] = []
    expires_at: Optional[datetime] = None
    delivery_date: Optional[date] = None
    created_at: datetime
    published_at: Optional[datetime] = None
    owner: JobOwnerResponse
    category: Optional[CategorySimpleResponse] = None
    subcategory: Optional[SubcategorySimpleResponse] = None
    skills: list[SkillResponse] = []
    proposals_count: int = 0

    class Config:
        from_attributes = True


class JobListItem(BaseModel):
    """เบากว่า JobResponse — ใช้ใน list/browse"""
    id: UUID
    job_type: str
    title: str
    budget: Optional[Decimal] = None
    status: str
    images: list[str] = []
    tags: list[str] = []
    expires_at: Optional[datetime] = None
    delivery_date: Optional[date] = None
    created_at: datetime
    published_at: Optional[datetime] = None
    owner: JobOwnerResponse
    category: Optional[CategorySimpleResponse] = None
    subcategory: Optional[SubcategorySimpleResponse] = None
    skills: list[SkillResponse] = []
    proposals_count: int = 0

    class Config:
        from_attributes = True


class PaginatedJobsResponse(BaseModel):
    data: list[JobListItem]
    total: int
    skip: int
    limit: int


# ─────────────────────────────────────────────────────────────────
# Proposal Schemas
# ─────────────────────────────────────────────────────────────────

class CreateProposalRequest(BaseModel):
    message: Optional[str] = None
    proposed_budget: Optional[Decimal] = Field(None, ge=0)


class CreateDirectProposalRequest(BaseModel):
    """DM-based deal — ไม่ผ่าน job post"""
    target_user_id: UUID
    intent: str = Field(..., description="'hire' = ฉันจะจ้างเขา | 'offer' = ฉันเสนอบริการ")
    message: Optional[str] = None
    proposed_budget: Optional[Decimal] = Field(None, ge=0)


class ProposalUserResponse(BaseModel):
    id: UUID
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class RejectProposalRequest(BaseModel):
    reason: Optional[str] = None


class ProposalResponse(BaseModel):
    id: UUID
    job_id: Optional[UUID] = None
    job_title: Optional[str] = None
    client_id: UUID
    freelancer_id: UUID
    proposer_id: UUID
    message: Optional[str] = None
    proposed_budget: Optional[Decimal] = None
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    responded_at: Optional[datetime] = None
    client: ProposalUserResponse
    freelancer: ProposalUserResponse

    class Config:
        from_attributes = True
