from pydantic import BaseModel, Field
from decimal import Decimal
from uuid import UUID
from datetime import datetime, date
from typing import Any, List, Optional


# ─────────────────────────────────────────────────────────────────
# Shared sub-schemas
# ─────────────────────────────────────────────────────────────────

class UserBriefSchema(BaseModel):
    id: UUID
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────
# Project
# ─────────────────────────────────────────────────────────────────

class ProjectResponseSchema(BaseModel):
    id: UUID
    proposal_id: Optional[UUID] = None
    job_id: Optional[UUID] = None
    client_id: UUID
    freelancer_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    total_budget: Optional[Decimal] = None
    status: str
    deadline_date: Optional[date] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    client_completion_confirmed_at: Optional[datetime] = None
    freelancer_completion_confirmed_at: Optional[datetime] = None
    created_at: datetime
    client: Optional[UserBriefSchema] = None
    freelancer: Optional[UserBriefSchema] = None
    images: List[str] = []
    skill_tags: List[str] = []
    categories: List[Any] = []
    progress_percent: Optional[float] = None
    milestone_plan_pending: bool = False
    milestone_plan_proposed_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class ProjectListItemSchema(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    status: str
    total_budget: Optional[Decimal] = None
    deadline_date: Optional[date] = None
    started_at: datetime
    client: Optional[UserBriefSchema] = None
    freelancer: Optional[UserBriefSchema] = None
    progress_percent: Optional[float] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────
# Calendar
# ─────────────────────────────────────────────────────────────────

class CalendarEventSchema(BaseModel):
    """
    event_type:
      milestone        — milestone.due_date (pending/in_progress/submitted/rejected)
      project_deadline — project.deadline_date
      job_expires      — job.expires_at (owner only)
    """
    event_type: str                    # milestone | project_deadline | job_expires
    event_date: date                   # วันที่แสดงบนปฎิทิน
    title: str                         # ชื่อ milestone / project / job
    project_title: Optional[str] = None  # ชื่อ project (สำหรับ milestone event)
    project_id: Optional[UUID] = None  # ใช้ navigate ไป workspace
    milestone_id: Optional[UUID] = None
    job_id: Optional[UUID] = None
    status: Optional[str] = None       # milestone status / project status / job status
    is_overdue: bool = False           # event_date < today

    class Config:
        from_attributes = True


class CalendarEventsResponse(BaseModel):
    data: list[CalendarEventSchema]


class PaginatedProjectResponse(BaseModel):
    data: list[ProjectListItemSchema]
    total: int
    page: int
    page_size: int


# ─────────────────────────────────────────────────────────────────
# Milestone
# ─────────────────────────────────────────────────────────────────

class MilestoneCreateSchema(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(None, ge=0)
    sequence: int = Field(1, ge=1)
    due_date: Optional[date] = None


class MilestoneUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(None, ge=0)
    due_date: Optional[date] = None
    sequence: Optional[int] = Field(None, ge=1)


class MilestoneResequenceItemSchema(BaseModel):
    id: UUID
    sequence: int = Field(..., ge=1)


class MilestonePlanReviewSchema(BaseModel):
    action: str = Field(..., description="approve | reject")
    message: Optional[str] = None


class MilestoneResponseSchema(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    sequence: int
    due_date: Optional[date] = None
    status: str
    funding_status: str
    funded_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────
# Milestone Submission
# ─────────────────────────────────────────────────────────────────

class SubmitMilestoneSchema(BaseModel):
    message: Optional[str] = None
    file_ids: list[UUID] = Field(default_factory=list, description="File IDs จาก /files/upload")


class ReviewSubmissionSchema(BaseModel):
    action: str = Field(..., description="approve | reject (request revision)")
    feedback: Optional[str] = None


class SubmissionFileSchema(BaseModel):
    id: UUID
    file_id: UUID
    sort_order: int
    file_url: Optional[str] = None
    original_name: Optional[str] = None

    class Config:
        from_attributes = True


class MilestoneSubmissionResponseSchema(BaseModel):
    id: UUID
    milestone_id: UUID
    submitted_by: UUID
    revision_number: int
    message: Optional[str] = None
    status: str
    auto_release_eligible: bool
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    files: list[SubmissionFileSchema] = []

    class Config:
        from_attributes = True


class PayoutMilestoneSummarySchema(BaseModel):
    milestone_id: UUID
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    funding_status: Optional[str] = None
    released_amount: Decimal = Decimal("0.00")


class ProjectPayoutSummarySchema(BaseModel):
    project_id: UUID
    currency: Optional[str] = None
    total_milestone_amount: Decimal
    total_funded_amount: Decimal
    total_released_amount: Decimal
    total_available_amount: Decimal
    milestones: list[PayoutMilestoneSummarySchema] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────────
# Offer payload (deal room compatibility)
# ─────────────────────────────────────────────────────────────────

class OfferMilestoneCompatibilitySchema(BaseModel):
    id: UUID
    offer_id: UUID
    title: str
    description: Optional[str] = None
    amount: Decimal
    estimated_days: Optional[int] = None
    deliverables: list[str] = Field(default_factory=list)
    status: Optional[str] = None
    created_at: datetime


class ProjectOfferCompatibilitySchema(BaseModel):
    id: UUID
    job_id: Optional[UUID] = None
    client_id: UUID
    freelancer_id: UUID
    freelancer_firstname: Optional[str] = None
    freelancer_lastname: Optional[str] = None
    freelancer_username: Optional[str] = None
    proposed_budget: Decimal
    currency: str = "THB"
    message: Optional[str] = None
    attachments: list[str] = Field(default_factory=list)
    offer_type: Optional[str] = None
    status: str
    created_at: datetime
    proposed_milestones: list[OfferMilestoneCompatibilitySchema] = Field(default_factory=list)


class OfferMilestoneInputSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0)
    estimated_days: Optional[int] = Field(default=None, ge=1)
    description: Optional[str] = None


class AcceptOfferSchema(BaseModel):
    freelancer_id: Optional[str] = None
    proposed_budget: Decimal = Field(..., gt=0)
    currency: str = Field(default="THB", min_length=1, max_length=8)
    message: Optional[str] = None
    proposed_milestones: list[OfferMilestoneInputSchema] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────────
# Payout summary
# ─────────────────────────────────────────────────────────────────

class PayoutMilestoneSummarySchema(BaseModel):
    milestone_id: UUID
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    funding_status: Optional[str] = None
    released_amount: Decimal = Decimal("0")

    class Config:
        from_attributes = True


class ProjectPayoutSummarySchema(BaseModel):
    project_id: UUID
    currency: Optional[str] = None
    total_milestone_amount: Decimal = Decimal("0")
    total_funded_amount: Decimal = Decimal("0")
    total_released_amount: Decimal = Decimal("0")
    total_available_amount: Decimal = Decimal("0")
    milestones: list[PayoutMilestoneSummarySchema] = []
