from uuid import UUID
from typing import Optional
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_platform_admin
from app.core.database import get_db
from app.skills import service
from app.skills.models import Skill
from app.skills.schemas import (
    CategoryResponse,
    CategorySimpleResponse,
    CreateCategoryRequest,
    CreateSkillRequest,
    CreateSubcategoryRequest,
    LinkSkillToSubcategoryRequest,
    SkillResponse,
    SubcategoryResponse,
)

router = APIRouter(prefix="/skills", tags=["Skills"])


# ─────────────────────────────────────────────────────────────────
# Categories — Public
# ─────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """ดึง categories ทั้งหมด พร้อม subcategories และ skills"""
    return service.get_all_categories(db)


@router.get("/categories/simple", response_model=list[CategorySimpleResponse])
def list_categories_simple(db: Session = Depends(get_db)):
    """Categories เฉพาะชื่อ+slug — ใช้ dropdown เบา"""
    return service.get_all_categories(db)


@router.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category(category_id: UUID, db: Session = Depends(get_db)):
    cat = service.get_category_by_id(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


# ─────────────────────────────────────────────────────────────────
# Skills — Public
# ─────────────────────────────────────────────────────────────────

@router.get("/search", response_model=list[SkillResponse])
def search_skills(
    q: str = Query(..., min_length=1, description="ค้นหาด้วยชื่อ"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """ค้นหา skills — ใช้ autocomplete ใน skill input"""
    return service.search_skills(db, q=q, limit=limit)


@router.get("/subcategories/{subcategory_id}/skills", response_model=list[SkillResponse])
def get_skills_by_subcategory(subcategory_id: UUID, db: Session = Depends(get_db)):
    """Skills ทั้งหมดใน subcategory"""
    return service.get_skills_by_subcategory(db, subcategory_id)


# ─────────────────────────────────────────────────────────────────
# Admin — Create (platform_admin only)
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/categories",
    response_model=CategorySimpleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_platform_admin)],
)
def create_category(body: CreateCategoryRequest, db: Session = Depends(get_db)):
    try:
        return service.create_category(db, name=body.name, slug=body.slug, icon=body.icon)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post(
    "/categories/{category_id}/subcategories",
    response_model=SubcategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_platform_admin)],
)
def create_subcategory(
    category_id: UUID,
    body: CreateSubcategoryRequest,
    db: Session = Depends(get_db),
):
    try:
        return service.create_subcategory(db, category_id=category_id, name=body.name, slug=body.slug)
    except ValueError as e:
        raise HTTPException(status_code=404 if "not found" in str(e) else 409, detail=str(e))


@router.post(
    "/skills",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_platform_admin)],
)
def create_skill(body: CreateSkillRequest, db: Session = Depends(get_db)):
    try:
        return service.create_skill(db, name=body.name, slug=body.slug)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post(
    "/subcategories/{subcategory_id}/skills",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_platform_admin)],
)
def link_skill(
    subcategory_id: UUID,
    body: LinkSkillToSubcategoryRequest,
    db: Session = Depends(get_db),
):
    """เชื่อม skill เข้า subcategory (many-to-many)"""
    service.link_skill_to_subcategory(db, subcategory_id=subcategory_id, skill_id=body.skill_id)


# ─────────────────────────────────────────────────────────────────
# Get-or-create a skill by name (auth required)
# ─────────────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class _GetOrCreateBody(_BaseModel):
    name: str

@router.post("/get-or-create", response_model=SkillResponse, status_code=200)
def get_or_create_skill(
    body: _GetOrCreateBody,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Find a skill by name (case-insensitive). Create it if it doesn't exist."""
    import unicodedata, uuid as _uuid_mod
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name must not be empty")

    # Try to find existing by exact name (case-insensitive)
    existing = db.query(Skill).filter(Skill.name.ilike(name)).first()
    if existing:
        return existing

    # Build slug: transliterate unicode → ASCII, keep alphanumeric + hyphens
    try:
        normalized = unicodedata.normalize("NFKD", name.lower())
        ascii_part = normalized.encode("ascii", "ignore").decode("ascii")
        slug = re.sub(r"[^a-z0-9]+", "-", ascii_part).strip("-")
    except Exception:
        slug = ""

    # If slug is empty (e.g. pure Thai), use a uuid-based slug
    if not slug:
        slug = f"skill-{str(_uuid_mod.uuid4())[:8]}"

    # Try by slug
    existing_by_slug = db.query(Skill).filter(Skill.slug == slug).first()
    if existing_by_slug:
        # It's a different name, so we still create — just need a unique slug
        pass

    # Ensure slug uniqueness
    base_slug = slug
    counter = 1
    while db.query(Skill).filter(Skill.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    skill = Skill(name=name, slug=slug)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill
