import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        Index("ix_projects_client", "client_id"),
        Index("ix_projects_freelancer", "freelancer_id"),
        Index("ix_projects_status", "status"),
        Index("ix_projects_job", "job_id"),
        Index("ix_projects_proposal", "proposal_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id"),
        nullable=True,
        comment="NULL for direct-message deals",
    )
    proposal_id = Column(
        UUID(as_uuid=True),
        ForeignKey("proposals.id"),
        nullable=True,
        comment="NULL = pre-contract project from job post, set when proposal is accepted",
    )
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    freelancer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    total_budget = Column(Numeric(12, 2), nullable=True)
    status = Column(String(20), default=ProjectStatus.ACTIVE, nullable=False)
    deadline_date = Column(Date, nullable=True)

    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    client_completion_confirmed_at = Column(DateTime, nullable=True)
    freelancer_completion_confirmed_at = Column(DateTime, nullable=True)
    milestone_plan_pending = Column(Boolean, default=False, nullable=False, server_default="false")
    milestone_plan_proposed_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    client = relationship("User", foreign_keys=[client_id])
    freelancer = relationship("User", foreign_keys=[freelancer_id])
    job = relationship("Job", foreign_keys=[job_id])
    proposal = relationship("Proposal", back_populates="project", uselist=False)
    job = relationship("Job", foreign_keys=[job_id], lazy="joined")
    milestones = relationship(
        "Milestone",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="Milestone.sequence",
    )

    @property
    def images(self):
        return list(self.job.images or []) if self.job else []

    @property
    def skill_tags(self):
        if not self.job:
            return []
        return [s.name for s in self.job.skills if s and s.name]

    @property
    def categories(self):
        if not self.job or not self.job.category:
            return []
        cat = self.job.category
        return [{"code": cat.slug or "", "type": "job", "label": cat.name or "-"}]

    @property
    def progress_percent(self) -> float:
        ms = self.milestones
        if not ms:
            return 0.0
        done = sum(
            1 for m in ms
            if m.status in ("approved", "paid", "completed")
        )
        return round(done / len(ms) * 100, 1)


class MilestoneStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"    # freelancer ส่งงาน
    APPROVED = "approved"      # client อนุมัติ
    REVISION_REQUESTED = "revision_requested"  # client ขอแก้ไข → freelancer ส่งใหม่
    REJECTED = "rejected"      # legacy status (keep for backward compatibility)
    PAID = "paid"              # เงินออกให้ freelancer แล้ว


class MilestoneFundingStatus(str, enum.Enum):
    UNFUNDED = "unfunded"
    FUNDED = "funded"
    RELEASED = "released"


class Milestone(Base):
    __tablename__ = "milestones"
    __table_args__ = (
        Index("ix_milestones_project", "project_id"),
        Index("ix_milestones_status", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(12, 2), nullable=True)
    sequence = Column(Integer, nullable=False, default=1)
    due_date = Column(Date, nullable=True)

    status = Column(String(20), default=MilestoneStatus.PENDING, nullable=False)
    funding_status = Column(
        String(20),
        default=MilestoneFundingStatus.UNFUNDED,
        nullable=False,
    )
    funded_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    project = relationship("Project", back_populates="milestones")
    submissions = relationship(
        "MilestoneSubmission",
        back_populates="milestone",
        cascade="all, delete-orphan",
    )


class MilestoneSubmission(Base):
    __tablename__ = "milestone_submissions"
    __table_args__ = (
        Index("ix_milestone_submissions_milestone", "milestone_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    milestone_id = Column(
        UUID(as_uuid=True),
        ForeignKey("milestones.id", ondelete="CASCADE"),
        nullable=False,
    )
    submitted_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="freelancer ที่กด submit งาน",
    )
    revision_number = Column(
        Integer,
        default=1,
        nullable=False,
        comment="รอบที่ส่ง — เพิ่มขึ้นทุกครั้งที่ client reject แล้ว freelancer ส่งใหม่",
    )
    message = Column(
        Text,
        nullable=True,
        comment="ข้อความอธิบายงานที่ส่ง เช่น สิ่งที่ทำ, link, หมายเหตุ",
    )
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        comment="pending = รอ client ตรวจ | approved = client อนุมัติ | revision_requested = client ขอแก้ไข",
    )
    auto_release_eligible = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="True = client ไม่ตรวจงานเกิน SLA_CLIENT_REVIEW_DAYS → admin สามารถ force approve ได้",
    )
    submitted_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        comment="เวลาที่ freelancer กด submit — ใช้คำนวณ SLA",
    )
    reviewed_at = Column(
        DateTime,
        nullable=True,
        comment="เวลาที่ client อนุมัติหรือ reject — NULL = ยังรอการตรวจ",
    )

    milestone = relationship("Milestone", back_populates="submissions")
    submitter = relationship("User", foreign_keys=[submitted_by])
    files = relationship(
        "MilestoneSubmissionFile",
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="MilestoneSubmissionFile.sort_order",
    )


class MilestoneSubmissionFile(Base):
    __tablename__ = "milestone_submission_files"
    __table_args__ = (
        Index("ix_submission_files_submission", "submission_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("milestone_submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_id = Column(
        UUID(as_uuid=True),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    submission = relationship("MilestoneSubmission", back_populates="files")
    file = relationship("File", foreign_keys=[file_id])
