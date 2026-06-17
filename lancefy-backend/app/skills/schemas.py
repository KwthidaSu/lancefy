from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, model_validator


# ─────────────────────────────────────────────────────────────────
# Skill
# ─────────────────────────────────────────────────────────────────

class SkillResponse(BaseModel):
    id: UUID
    name: str
    slug: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────
# Subcategory
# ─────────────────────────────────────────────────────────────────

class SubcategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    skills: list[SkillResponse] = []

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def extract_skills_from_links(cls, data):
        # SQLAlchemy object: read skill_links → extract .skill
        if hasattr(data, "skill_links"):
            data.__dict__["skills"] = [link.skill for link in (data.skill_links or [])]
        return data


# ─────────────────────────────────────────────────────────────────
# Category
# ─────────────────────────────────────────────────────────────────

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    icon: Optional[str] = None
    subcategories: list[SubcategoryResponse] = []

    class Config:
        from_attributes = True


class CategorySimpleResponse(BaseModel):
    """ไม่มี subcategories — ใช้ใน dropdown เบา"""
    id: UUID
    name: str
    slug: str
    icon: Optional[str] = None

    class Config:
        from_attributes = True


class SubcategorySimpleResponse(BaseModel):
    """ไม่มี skills — ใช้ embed ใน job response"""
    id: UUID
    name: str
    slug: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────
# Admin — Create
# ─────────────────────────────────────────────────────────────────

class CreateCategoryRequest(BaseModel):
    name: str
    slug: str
    icon: Optional[str] = None


class CreateSubcategoryRequest(BaseModel):
    name: str
    slug: str


class CreateSkillRequest(BaseModel):
    name: str
    slug: str


class LinkSkillToSubcategoryRequest(BaseModel):
    skill_id: UUID
