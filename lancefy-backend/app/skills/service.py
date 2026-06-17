from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.skills.models import Category, Subcategory, Skill, SubcategorySkill, UserSkill


# ─────────────────────────────────────────────────────────────────
# Categories
# ─────────────────────────────────────────────────────────────────

def get_all_categories(db: Session) -> list[Category]:
    """ดึง categories ทั้งหมด พร้อม subcategories และ skills"""
    return (
        db.query(Category)
        .options(
            joinedload(Category.subcategories).joinedload(
                Subcategory.skill_links
            ).joinedload(SubcategorySkill.skill)
        )
        .order_by(Category.name)
        .all()
    )


def get_category_by_id(db: Session, category_id: UUID) -> Optional[Category]:
    return (
        db.query(Category)
        .options(
            joinedload(Category.subcategories).joinedload(
                Subcategory.skill_links
            ).joinedload(SubcategorySkill.skill)
        )
        .filter(Category.id == category_id)
        .first()
    )


def create_category(db: Session, name: str, slug: str, icon: Optional[str]) -> Category:
    if db.query(Category).filter(Category.slug == slug).first():
        raise ValueError(f"slug '{slug}' already exists")
    cat = Category(name=name, slug=slug, icon=icon)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ─────────────────────────────────────────────────────────────────
# Subcategories
# ─────────────────────────────────────────────────────────────────

def create_subcategory(db: Session, category_id: UUID, name: str, slug: str) -> Subcategory:
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise ValueError("category not found")
    if db.query(Subcategory).filter(Subcategory.slug == slug).first():
        raise ValueError(f"slug '{slug}' already exists")
    sub = Subcategory(category_id=category_id, name=name, slug=slug)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


# ─────────────────────────────────────────────────────────────────
# Skills
# ─────────────────────────────────────────────────────────────────

def search_skills(db: Session, q: str, limit: int = 20) -> list[Skill]:
    """ค้นหา skill ด้วยชื่อ — ใช้ตอน user พิมพ์ใน skill input"""
    return (
        db.query(Skill)
        .filter(Skill.name.ilike(f"%{q}%"))
        .order_by(Skill.name)
        .limit(limit)
        .all()
    )


def get_skills_by_subcategory(db: Session, subcategory_id: UUID) -> list[Skill]:
    return (
        db.query(Skill)
        .join(SubcategorySkill, SubcategorySkill.skill_id == Skill.id)
        .filter(SubcategorySkill.subcategory_id == subcategory_id)
        .order_by(Skill.name)
        .all()
    )


def create_skill(db: Session, name: str, slug: str) -> Skill:
    if db.query(Skill).filter(Skill.slug == slug).first():
        raise ValueError(f"slug '{slug}' already exists")
    skill = Skill(name=name, slug=slug)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


def link_skill_to_subcategory(db: Session, subcategory_id: UUID, skill_id: UUID) -> None:
    exists = (
        db.query(SubcategorySkill)
        .filter(
            SubcategorySkill.subcategory_id == subcategory_id,
            SubcategorySkill.skill_id == skill_id,
        )
        .first()
    )
    if exists:
        return
    link = SubcategorySkill(subcategory_id=subcategory_id, skill_id=skill_id)
    db.add(link)
    db.commit()


# ─────────────────────────────────────────────────────────────────
# User Skills
# ─────────────────────────────────────────────────────────────────

def get_user_skills(db: Session, user_id: UUID) -> list[Skill]:
    return (
        db.query(Skill)
        .join(UserSkill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == user_id)
        .order_by(Skill.name)
        .all()
    )


def set_user_skills(db: Session, user_id: UUID, skill_ids: list[UUID]) -> list[Skill]:
    """
    Replace ทั้งหมด — ลบ skills เก่าของ user แล้ว insert ใหม่
    """
    db.query(UserSkill).filter(UserSkill.user_id == user_id).delete()

    # validate ว่า skill_ids มีอยู่จริง
    skills = db.query(Skill).filter(Skill.id.in_(skill_ids)).all()
    found_ids = {s.id for s in skills}
    invalid = [str(sid) for sid in skill_ids if sid not in found_ids]
    if invalid:
        raise ValueError(f"skill ids not found: {', '.join(invalid)}")

    for skill_id in skill_ids:
        db.add(UserSkill(user_id=user_id, skill_id=skill_id))

    db.commit()
    return skills
