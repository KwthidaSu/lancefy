import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class KYCStatusEnum(str, enum.Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    NEEDS_RESUBMISSION = "needs_resubmission"


class KYCAuditActorType(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SYSTEM = "system"


class KYCAuditEvent(str, enum.Enum):
    SUBMITTED = "submitted"
    ID_CARD_UPLOADED = "id_card_uploaded"
    SELFIE_UPLOADED = "selfie_uploaded"
    DOCUMENTS_COMPLETED = "documents_completed"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_RESUBMISSION = "needs_resubmission"


class KYCProfile(Base):
    """
    ข้อมูล KYC ของ user — 1 user = 1 profile
    Admin ตรวจสอบและอัปเดต status + review fields
    """
    __tablename__ = "kyc_profiles"
    __table_args__ = (
        Index("ix_kyc_profiles_status", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    full_name = Column(String, nullable=False)
    citizen_id = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    country = Column(String, nullable=False)
    address = Column(String, nullable=False)

    # Status (mirrors users.kyc_status — source of truth)
    status = Column(
        String,
        default=KYCStatusEnum.PENDING,
        nullable=False,
        comment="pending | verified | rejected | needs_resubmission",
    )

    # Admin review
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True,
                         comment="Admin user ที่ตรวจสอบ")
    review_note = Column(Text, nullable=True, comment="เหตุผลที่ reject หรือ note จาก admin")
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    reviewer = relationship("User", foreign_keys=[reviewed_by])
    id_cards = relationship("KYCIDCard", back_populates="profile", cascade="all, delete-orphan")
    selfies = relationship("KYCSelfie", back_populates="profile", cascade="all, delete-orphan")
    audit_logs = relationship(
        "KYCAuditLog",
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="KYCAuditLog.created_at.desc()",
    )


class KYCIDCard(Base):
    __tablename__ = "kyc_id_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kyc_profile_id = Column(UUID(as_uuid=True), ForeignKey("kyc_profiles.id", ondelete="CASCADE"), nullable=False)
    front_image_file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=False)
    back_image_file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    profile = relationship("KYCProfile", back_populates="id_cards")


class KYCSelfie(Base):
    __tablename__ = "kyc_selfies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kyc_profile_id = Column(UUID(as_uuid=True), ForeignKey("kyc_profiles.id", ondelete="CASCADE"), nullable=False)
    image_file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    profile = relationship("KYCProfile", back_populates="selfies")


class KYCAuditLog(Base):
    __tablename__ = "kyc_audit_logs"
    __table_args__ = (
        Index("ix_kyc_audit_profile_created", "kyc_profile_id", "created_at"),
        Index("ix_kyc_audit_user_created", "user_id", "created_at"),
        Index("ix_kyc_audit_event", "event_type"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kyc_profile_id = Column(
        UUID(as_uuid=True),
        ForeignKey("kyc_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_type = Column(
        String(20),
        nullable=False,
        default=KYCAuditActorType.SYSTEM,
        comment="user | admin | system",
    )
    event_type = Column(
        String(50),
        nullable=False,
        comment="submitted | id_card_uploaded | selfie_uploaded | documents_completed | approved | rejected | needs_resubmission",
    )
    from_status = Column(String(40), nullable=True)
    to_status = Column(String(40), nullable=True)
    note = Column(Text, nullable=True)
    extra_data = Column(JSONB, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    profile = relationship("KYCProfile", back_populates="audit_logs")
    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_user_id])

# [DEPRECATED] KYCStatus table — status ย้ายไปอยู่ใน kyc_profiles.status แล้ว
# class KYCStatus(Base): ...
