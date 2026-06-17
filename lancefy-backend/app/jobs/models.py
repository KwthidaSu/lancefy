"""
Job Board Models
================
ระบบ job board ใหม่ — แยกออกมาจาก app/projects/models.py

หมายเหตุ migration:
  - ตาราง categories / category_translations / job_categories (เก่า) จะถูก drop
    หลังจาก data migration ไปยัง categories (ใหม่) + subcategories เสร็จ
  - ตาราง job_offers (เก่า) → ถูกแทนที่ด้วย proposals
  - ตาราง jobs (เก่า) → ALTER + ADD COLUMN ให้ตรงกับ schema ใหม่
"""

import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Index,
    Integer, Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY as PG_ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.skills.models import (  # noqa: F401 — re-export for convenience
    Category, Subcategory, Skill, UserSkill,
)


# ─────────────────────────────────────────────────────────────────
# JOB POST
# Replaces old Job model in projects/models.py (DEPRECATED)
# ─────────────────────────────────────────────────────────────────

class JobType(str, enum.Enum):
    HIRE = "hire"        # client หาคนทำงาน (ประกาศรับสมัคร)
    SERVICE = "service"  # freelancer เสนอบริการ (gig/listing)


class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    ACTIVE = "active"
    COMPLETE = "complete"
    CANCELLED = "cancelled"
    CLOSED = "cancelled"    # legacy alias
    EXPIRED = "cancelled"   # legacy alias
    DELETED = "cancelled"   # legacy alias


class Job(Base):
    """
    Job board post — โพสหางาน (hire) หรือโพสเสนอบริการ (service)

    Flow:
      hire:    client โพส → freelancer ยื่น proposal → client accept → Project
      service: freelancer โพส → client ยื่น proposal → freelancer accept → Project
    """
    __tablename__ = "jobs"
    __table_args__ = (
        Index("ix_jobs_owner", "owner_id"),
        Index("ix_jobs_status_type", "status", "job_type"),
        Index("ix_jobs_category", "category_id"),
        Index("ix_jobs_subcategory", "subcategory_id"),
        Index("ix_jobs_expires_at", "expires_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    job_type = Column(
        String(20),
        default=JobType.HIRE,
        nullable=False,
        comment="hire = client หาคน | service = freelancer เสนอบริการ",
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    images = Column(JSONB, default=list, nullable=False, comment="URL รูปประกอบ/ตัวอย่างงาน")
    tags = Column(PG_ARRAY(String), nullable=False, default=list, server_default="{}",
                  comment="free-form tags ที่ client พิมพ์เอง เช่น 'ด่วน', 'remote ok'")

    # Budget
    budget = Column(Numeric(12, 2), nullable=True)

    # Category
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=True,
    )
    subcategory_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subcategories.id"),
        nullable=True,
    )

    # Status & dates
    status = Column(String(20), default=JobStatus.OPEN, nullable=False)
    expires_at = Column(DateTime, nullable=True, comment="วันหมดอายุการรับ proposal")
    delivery_date = Column(Date, nullable=True, comment="วันที่ต้องการส่งมอบงาน (nullable)")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    category = relationship("Category", back_populates="jobs")
    subcategory = relationship("Subcategory")
    skill_links = relationship(
        "JobSkill",
        back_populates="job",
        cascade="all, delete-orphan",
    )
    proposals = relationship(
        "Proposal",
        back_populates="job",
        cascade="all, delete-orphan",
    )

    @property
    def skills(self):
        return [link.skill for link in self.skill_links if link.skill]


class JobSkill(Base):
    """Junction: job ↔ skill (ทักษะที่งานต้องการ)"""
    __tablename__ = "job_skills"
    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        primary_key=True,
    )
    skill_id = Column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        primary_key=True,
    )

    job = relationship("Job", back_populates="skill_links")
    skill = relationship("Skill")


# ─────────────────────────────────────────────────────────────────
# PROPOSAL
# Replaces: job_offers (DEPRECATED) — ไม่มี milestone อยู่ที่นี่
# ─────────────────────────────────────────────────────────────────

class ProposalStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"   # proposer ถอน proposal เอง
    CANCELLED = "cancelled"   # ยุติหลัง accepted แต่ก่อนเปิด project


class Proposal(Base):
    """
    การเสนองาน / ยื่น bid ต่อ Job post หรือ deal จาก DM

    client_id + freelancer_id ถูก resolve และบันทึกตั้งแต่ตอนสร้าง proposal เสมอ:
      Job Board (hire):    client_id=job.owner_id,   freelancer_id=proposer_id
      Job Board (service): client_id=proposer_id,    freelancer_id=job.owner_id
      DM-based deal:       set โดย service layer จาก intent ที่ user เลือก

    ผลลัพธ์: accept_proposal() copy client_id/freelancer_id เข้า Project ได้ตรงเลย
    ไม่มี conditional branch logic ที่ downstream

    Milestone ไม่อยู่ที่นี่ — อยู่ใน Project หลังจาก proposal accepted
    """
    __tablename__ = "proposals"
    __table_args__ = (
        Index("ix_proposals_job", "job_id"),
        Index("ix_proposals_client", "client_id"),
        Index("ix_proposals_freelancer", "freelancer_id"),
        Index("ix_proposals_status", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=True,
        comment="NULL = deal จาก DM (ไม่ผ่าน job board)",
    )

    # Resolved roles — บังคับใส่ทั้ง 2 ฝั่งเสมอ ณ ตอนสร้าง
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="ฝั่งจ้าง — resolve จาก job_type หรือ intent ที่ service layer",
    )
    freelancer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="ฝั่งรับงาน — resolve จาก job_type หรือ intent ที่ service layer",
    )

    # audit: ใครกด submit (อาจเป็น client หรือ freelancer ก็ได้)
    proposer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        comment="คนที่กด submit proposal — เก็บไว้เพื่อ audit trail",
    )

    message = Column(Text, nullable=True, comment="ข้อความแนบ proposal")
    proposed_budget = Column(
        Numeric(12, 2),
        nullable=True,
        comment="งบที่เสนอ — NULL = ยอมรับตาม job budget",
    )

    status = Column(String(20), default=ProposalStatus.PENDING, nullable=False)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    responded_at = Column(DateTime, nullable=True, comment="เวลาที่อีกฝ่ายตอบรับ/ปฏิเสธ")

    job = relationship("Job", back_populates="proposals")
    client = relationship("User", foreign_keys=[client_id])
    freelancer = relationship("User", foreign_keys=[freelancer_id])
    proposer = relationship("User", foreign_keys=[proposer_id])
    project = relationship("Project", back_populates="proposal", uselist=False)
