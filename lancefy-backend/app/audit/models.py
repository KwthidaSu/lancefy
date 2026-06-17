"""
Audit & Activity Log Models
============================
แยกเป็น 2 table ตามหน้าที่:

  audit_logs    — Security / Compliance / Admin
                  consumer: admin panel, security team
                  เก็บตลอดไป, immutable

  activity_logs — Business events / Project timeline
                  consumer: project feed, notification trigger
                  archive ได้เมื่อเก่า
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship

from app.core.database import Base


# ─────────────────────────────────────────────────────────────────
# AUDIT LOG — Security / Compliance
# ─────────────────────────────────────────────────────────────────

class AuditAction(str, enum.Enum):
    # Auth
    USER_LOGIN          = "user.login"
    USER_LOGOUT         = "user.logout"
    USER_REGISTER       = "user.register"
    PASSWORD_RESET      = "user.password_reset"

    # Admin actions
    USER_BAN            = "admin.user_ban"
    USER_UNBAN          = "admin.user_unban"
    USER_DELETE         = "admin.user_delete"
    ADMIN_ACTION        = "admin.action"

    # KYC (compliance)
    KYC_SUBMITTED       = "kyc.submitted"
    KYC_APPROVED        = "kyc.approved"
    KYC_REJECTED        = "kyc.rejected"

    # Payment admin
    PAYOUT_PROCESSED    = "payment.payout_processed"
    DISPUTE_RESOLVED    = "dispute.resolved"


class AuditLog(Base):
    """
    Immutable security/compliance trail — ห้ามแก้ไขหรือลบ
    เก็บ ip_address + user_agent + old/new value สำหรับ forensics
    """
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_resource", "resource_type", "resource_id"),
        Index("ix_audit_user_created", "user_id", "created_at"),
        Index("ix_audit_action", "action"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="ผู้ทำ action — NULL = system/automated",
    )
    action = Column(String(60), nullable=False, comment="AuditAction enum value")

    resource_type = Column(
        String(40),
        nullable=True,
        comment="user | kyc | payment | dispute ฯลฯ",
    )
    resource_id = Column(UUID(as_uuid=True), nullable=True)

    old_value = Column(JSONB, nullable=True, comment="ค่าเดิมก่อน action — สำหรับ change tracking")
    new_value = Column(JSONB, nullable=True, comment="ค่าใหม่หลัง action")

    ip_address = Column(INET, nullable=True, comment="IP ของ request")
    user_agent = Column(Text, nullable=True, comment="Browser/client ที่ใช้")

    extra_data = Column(JSONB, default=dict, nullable=False, comment="context เพิ่มเติม สำหรับ debug")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    actor = relationship("User", foreign_keys=[user_id])


# ─────────────────────────────────────────────────────────────────
# ACTIVITY LOG — Business Events / Timeline
# ─────────────────────────────────────────────────────────────────

class ActivityEvent(str, enum.Enum):
    # Job board
    JOB_CREATED         = "job.created"
    JOB_CLOSED          = "job.closed"
    PROPOSAL_SUBMITTED  = "proposal.submitted"
    PROPOSAL_ACCEPTED   = "proposal.accepted"
    PROPOSAL_REJECTED   = "proposal.rejected"
    PROPOSAL_WITHDRAWN  = "proposal.withdrawn"

    # Project lifecycle
    PROJECT_CREATED     = "project.created"
    PROJECT_COMPLETED   = "project.completed"
    PROJECT_CANCELLED   = "project.cancelled"

    # Milestone
    MILESTONE_FUNDED    = "milestone.funded"
    MILESTONE_SUBMITTED = "milestone.submitted"
    MILESTONE_APPROVED  = "milestone.approved"
    MILESTONE_REJECTED  = "milestone.rejected"
    MILESTONE_RELEASED  = "milestone.released"

    # Dispute
    DISPUTE_OPENED      = "dispute.opened"


class ActivityLog(Base):
    """
    Business event log — ใช้แสดง project timeline feed และ trigger notifications
    snapshot เก็บ denormalized data เพื่อแสดงผลได้โดยไม่ต้อง JOIN
    archive ได้เมื่อข้อมูลเก่า
    """
    __tablename__ = "activity_logs"
    __table_args__ = (
        Index("ix_activity_actor", "actor_id"),
        Index("ix_activity_subject", "subject_type", "subject_id"),
        Index("ix_activity_event", "event"),
        Index("ix_activity_created", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    actor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="ผู้ทำ action — NULL = system/automated",
    )
    event = Column(String(60), nullable=False, comment="ActivityEvent enum value")

    subject_type = Column(
        String(40),
        nullable=True,
        comment="entity ที่เกิด event: job | proposal | project | milestone | dispute",
    )
    subject_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        comment="id ของ entity นั้น",
    )

    snapshot = Column(
        JSONB,
        default=dict,
        nullable=False,
        comment="ข้อมูล denormalized สำหรับแสดงผล feed โดยไม่ต้อง JOIN เช่น {title, amount, username}",
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    actor = relationship("User", foreign_keys=[actor_id])

