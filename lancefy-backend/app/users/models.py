import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class KYCStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_username", "username"),
        Index("ix_users_deleted_at", "deleted_at"),
        Index("ix_users_status", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keycloak_user_id = Column(UUID(as_uuid=True), unique=True, nullable=True)

    username = Column(String, nullable=True, unique=True, comment="Unique @handle")
    email = Column(String, nullable=False, unique=True, comment="User email")
    phone = Column(String, nullable=True)
    firstname = Column(String, nullable=True, comment="Given name")
    lastname = Column(String, nullable=True, comment="Family name")
    display_name = Column(String, nullable=True, comment="Public display name")
    avatar_url = Column(String, nullable=True, comment="Profile image URL")
    bio = Column(Text, nullable=True, comment="Short bio")

    status = Column(
        String,
        default="active",
        nullable=False,
        comment="active | inactive | invited | banned",
    )
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    kyc_status = Column(
        String,
        default=KYCStatus.UNVERIFIED,
        nullable=False,
        comment="unverified | pending | verified | rejected",
    )
    deleted_at = Column(DateTime, nullable=True, comment="Soft delete timestamp")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class UserFreelanceSkill(Base):
    __tablename__ = "user_freelance_skills"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_freelance_skill"),
        Index("ix_freelance_public", "is_public"),
        Index("ix_freelance_hourly_rate", "hourly_rate"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    tagline = Column(String(160), nullable=True, comment="Short public tagline")
    skills = Column(
        "skills",
        JSONB,
        nullable=False,
        default=list,
        server_default="[]",
        comment="Legacy free-form skill tags stored as JSON array",
    )
    hourly_rate = Column(Numeric(10, 2), nullable=True, comment="Hourly rate in THB")
    is_public = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="true = visible on /explore/freelancers",
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])


class ConsentType(str, enum.Enum):
    TERMS = "terms"
    PRIVACY = "privacy"
    COOKIE = "cookie"
    MARKETING = "marketing"


class UserConsent(Base):
    __tablename__ = "user_consents"
    __table_args__ = (
        Index("ix_user_consents_user_type", "user_id", "consent_type"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    consent_type = Column(String(20), nullable=False, comment="terms | privacy | cookie | marketing")
    version = Column(String(20), nullable=False, comment="Accepted document version")
    accepted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String(45), nullable=True, comment="IPv4/IPv6 at acceptance time")

    user = relationship("User", foreign_keys=[user_id])


class UserInvitation(Base):
    __tablename__ = "user_invitations"
    __table_args__ = (
        Index("ix_user_invitations_email", "email"),
        Index("ix_user_invitations_token", "token", unique=True),
        Index("ix_user_invitations_user_id", "user_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)
    token = Column(String, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    invited_by = Column(UUID(as_uuid=True), nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])
