from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.schemas import UserResponse, UserUpdate
from app.core.database import get_db
from app.skills.models import Skill, UserSkill
from app.users.models import UserFreelanceSkill

router = APIRouter(prefix="/auth", tags=["Auth"])


def _get_skill(db: Session, user_id):
    return (
        db.query(UserFreelanceSkill)
        .filter(UserFreelanceSkill.user_id == user_id)
        .first()
    )


def _get_user_skills(db: Session, user_id) -> list:
    """Load skills from the UserSkill join table."""
    rows = (
        db.query(Skill)
        .join(UserSkill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == user_id)
        .order_by(Skill.name)
        .all()
    )
    return [
        {"id": str(skill.id), "name": skill.name, "slug": skill.slug}
        for skill in rows
    ]


def _get_skill_tags(skill: UserFreelanceSkill | None) -> list[str]:
    """Keep legacy `tags` payloads compatible with the current JSONB `skills` field."""
    if not skill or not isinstance(skill.skills, list):
        return []
    return [str(item) for item in skill.skills if item]


def _serialize_user(user, skill=None, skills_list=None) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "phone": user.phone,
        "status": user.status,
        "firstname": user.firstname,
        "lastname": user.lastname,
        "display_name": user.display_name,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "kyc_status": user.kyc_status,
        "tagline": skill.tagline if skill else None,
        "tags": _get_skill_tags(skill),
        "skills": skills_list if skills_list is not None else [],
        "hourly_rate": skill.hourly_rate if skill else None,
        "is_public": skill.is_public if skill else False,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/user", response_model=UserResponse)
def get_user(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = _get_skill(db, user.id)
    skills_list = _get_user_skills(db, user.id)
    return _serialize_user(user, skill, skills_list)


@router.patch("/user", response_model=UserResponse)
def update_user(
    data: UserUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)

    user_fields = {
        "firstname",
        "lastname",
        "display_name",
        "username",
        "phone",
        "avatar_url",
        "bio",
    }
    for field in user_fields:
        if field in update_data:
            setattr(user, field, update_data[field])

    if "display_name" not in update_data:
        first = update_data.get("firstname", user.firstname)
        last = update_data.get("lastname", user.lastname)
        parts = [part for part in [first, last] if part]
        if parts and not user.display_name:
            user.display_name = " ".join(parts)

    user.updated_at = datetime.utcnow()
    db.commit()

    skill_fields = {"tagline", "hourly_rate", "is_public"}
    skill_data = {
        key: update_data[key]
        for key in skill_fields
        if key in update_data
    }
    if "tags" in update_data:
        skill_data["skills"] = update_data["tags"] or []

    if skill_data.get("is_public") is True and user.kyc_status != "verified":
        raise HTTPException(
            status_code=403,
            detail="ต้องยืนยันตัวตน (KYC) ก่อนจึงจะ public โปรไฟล์ได้",
        )

    if skill_data:
        skill = _get_skill(db, user.id)
        if skill is None:
            skill = UserFreelanceSkill(
                id=uuid.uuid4(),
                user_id=user.id,
                **skill_data,
            )
            db.add(skill)
        else:
            for key, value in skill_data.items():
                setattr(skill, key, value)
            skill.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(skill)
    else:
        skill = _get_skill(db, user.id)

    db.refresh(user)
    skills_list = _get_user_skills(db, user.id)
    return _serialize_user(user, skill, skills_list)
