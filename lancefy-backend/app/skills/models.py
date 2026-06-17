import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


# ─────────────────────────────────────────────────────────────────
# CATEGORY TAXONOMY
# ─────────────────────────────────────────────────────────────────

class Category(Base):
    """
    หมวดหมู่หลัก เช่น Programming & Tech, Design & Creative ฯลฯ
    (10 หมวดหมู่หลักตาม spec)
    """
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, comment="ชื่อหมวดหมู่ภาษาอังกฤษ")
    slug = Column(String(100), unique=True, nullable=False, index=True)
    icon = Column(String(200), nullable=True, comment="icon name (lucide) หรือ URL")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    subcategories = relationship(
        "Subcategory",
        back_populates="category",
        cascade="all, delete-orphan",
    )
    jobs = relationship("Job", back_populates="category")


class Subcategory(Base):
    """หมวดหมู่ย่อย เช่น Web Development, Mobile Apps ภายใต้ Programming & Tech"""
    __tablename__ = "subcategories"
    __table_args__ = (
        Index("ix_subcategories_category", "category_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    category = relationship("Category", back_populates="subcategories")
    skill_links = relationship(
        "SubcategorySkill",
        back_populates="subcategory",
        cascade="all, delete-orphan",
    )


# ─────────────────────────────────────────────────────────────────
# SKILLS
# ─────────────────────────────────────────────────────────────────

class Skill(Base):
    """ทักษะ/เทคโนโลยี เช่น Python, Figma, After Effects"""
    __tablename__ = "skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    subcategory_links = relationship(
        "SubcategorySkill",
        back_populates="skill",
        cascade="all, delete-orphan",
    )


class SubcategorySkill(Base):
    """Junction: subcategory ↔ skill (many-to-many — 1 skill อยู่ได้หลาย subcategory)"""
    __tablename__ = "subcategory_skills"
    subcategory_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subcategories.id", ondelete="CASCADE"),
        primary_key=True,
    )
    skill_id = Column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        primary_key=True,
    )

    subcategory = relationship("Subcategory", back_populates="skill_links")
    skill = relationship("Skill", back_populates="subcategory_links")


class UserSkill(Base):
    """
    ทักษะของ freelancer แบบ structured — replaces JSONB skills ใน user_freelance_skills
    1 row = freelancer คนนี้ถนัด skill นี้
    """
    __tablename__ = "user_skills"
    __table_args__ = (
        Index("ix_user_skills_user", "user_id"),
        Index("ix_user_skills_skill", "skill_id"),
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    skill_id = Column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
