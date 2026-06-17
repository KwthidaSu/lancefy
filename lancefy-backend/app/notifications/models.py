import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class NotificationType(str, enum.Enum):
    # Job board
    PROPOSAL_RECEIVED = "proposal_received"
    PROPOSAL_ACCEPTED = "proposal_accepted"
    PROPOSAL_REJECTED = "proposal_rejected"
    PROPOSAL_WITHDRAWN = "proposal_withdrawn"
    JOB_EXPIRED = "job_expired"
    # Deal / Project
    DEAL_OPENED = "deal_opened"
    PROJECT_CREATED = "project_created"
    # Work
    WORK_SUBMITTED = "work_submitted"
    WORK_APPROVED = "work_approved"
    WORK_REJECTED = "work_rejected"
    # Payment
    PAYMENT_FUNDED = "payment_funded"
    PAYMENT_RELEASED = "payment_released"
    PAYOUT_PROCESSED = "payout_processed"
    # Chat
    MESSAGE_RECEIVED = "message_received"
    # Admin / KYC
    KYC_APPROVED = "kyc_approved"
    KYC_REJECTED = "kyc_rejected"
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_RESOLVED = "dispute_resolved"

class NotificationReferenceType(str, enum.Enum):
    JOB = "job"
    PROPOSAL = "proposal"
    PROJECT = "project"
    MILESTONE = "milestone"
    PAYMENT = "payment"
    DISPUTE = "dispute"
    MESSAGE = "message"

class Notification(Base):
    """Immutable activity-based in-app notification record."""

    __tablename__ = "notifications"
    __table_args__ = (
        # หลัก: unread ของ user — query หลักในทุก request
        Index("ix_notifications_user_unread", "user_id", "is_read"),
        # หลัก: pagination เรียงตามเวลา
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ผู้รับ notification
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ผู้ทำเหตุ — เช่น "จอห์นส่ง offer มาให้คุณ" (nullable สำหรับ system notification)
    actor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Event type — drives icon/color on the frontend
    # stored as string for flexibility, values from NotificationType enum
    type = Column(String, nullable=False)

    title = Column(String, nullable=False)
    body = Column(String, nullable=True)

    # Optional deep-link reference
    reference_type = Column(String, nullable=True, comment="ประเภทของ entity ที่เกี่ยวข้อง เช่น project | offer | milestone | message")
    reference_id = Column(String, nullable=True, comment="UUID stored as string สำหรับอ้างอิงไปยัง entity ที่เกี่ยวข้อง")

    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True, comment="เวลาที่อ่าน — set พร้อมกับ is_read=True ที่ service layer")

    # TTL — cleanup job ลบ notification ที่ expires แล้ว (nullable = ไม่มีวันหมดอายุ)
    expires_at = Column(DateTime, nullable=True, comment="วันหมดอายุของ notification — cleanup job ใช้ลบ record นี้อัตโนมัติ")

    # Immutable — never updated after creation
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    actor = relationship("User", foreign_keys=[actor_id])


class NotificationSetting(Base):
    """
    การตั้งค่าว่า user อยากรับ notification ประเภทไหน ผ่านช่องไหน
    1 row = 1 type x 1 user (ถ้าไม่มี row แปลว่าเปิดทั้งหมด)
    """
    __tablename__ = "notification_settings"
    __table_args__ = (
        UniqueConstraint("user_id", "notification_type", name="uq_notification_setting"),
        Index("ix_notification_settings_user", "user_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String, nullable=False, comment="NotificationType enum value")

    in_app_enabled = Column(Boolean, default=True, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
