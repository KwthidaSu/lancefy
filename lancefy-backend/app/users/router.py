import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta
import secrets
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_platform_admin, require_staff
from app.auth.schemas import PublicUserResponse
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.kyc.models import KYCProfile
from app.skills.models import Skill, UserSkill
from app.reviews.models import Review
from app.services.keycloak_admin import (
    create_user_in_keycloak,
    get_user_realm_roles,
    list_realm_roles,
    set_user_enabled,
    set_user_password,
    sync_user_realm_role,
    update_user_in_keycloak,
)
from app.tasks.example import send_transactional_email
from app.users.models import User, UserFreelanceSkill, UserInvitation
from app.users.schemas import (
    AcceptInvitationRequest,
    AcceptInvitationResponse,
    AdminUserDetailResponse,
    AdminUserListItem,
    AdminUserInvitationSummary,
    AdminUserStatusUpdateRequest,
    AdminUserStatusUpdateResponse,
    FreelanceProfileUpdateRequest,
    InvitationPreviewResponse,
    InviteRoleOption,
    InviteUserRequest,
    InviteUserResponse,
)
from app.users.service import create_or_update_invited_user


class SetSkillsRequest(BaseModel):
    skill_ids: list[UUID] = Field(default_factory=list)

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger(__name__)

INVITABLE_REALM_ROLES = (
    "staff",
    "platform_admin",
)
USERNAME_PATTERN = re.compile(r"^[a-z0-9._-]{3,30}$")
PASSWORD_UPPERCASE_PATTERN = re.compile(r"[A-Z]")


def _format_role_label(role: str) -> str:
    if role == "platform_admin":
        return "Admin"
    if role == "staff":
        return "Staff"
    return role.replace("_", " ").title()


def _pick_primary_role(roles: list[str]) -> Optional[str]:
    preferred_order = [
        "platform_admin",
        "staff",
        "freelancer",
        "user",
    ]
    for role in preferred_order:
        if role in roles:
            return role

    filtered = [
        role
        for role in roles
        if not role.startswith("default-roles-")
        and role not in {"offline_access", "uma_authorization"}
    ]
    return filtered[0] if filtered else None


def _classify_user_group(roles: list[str]) -> str:
    if any(role in {"platform_admin", "staff"} for role in roles):
        return "backoffice"
    return "platform_user"


def _serialize_admin_user(
    user: User,
    invitation: Optional[UserInvitation],
    *,
    roles: Optional[list[str]] = None,
    has_kyc_profile: bool = False,
) -> AdminUserListItem:
    resolved_roles = roles or []
    if not resolved_roles and user.keycloak_user_id:
        try:
            resolved_roles = get_user_realm_roles(str(user.keycloak_user_id))
        except Exception:
            resolved_roles = []

    primary_role = _pick_primary_role(resolved_roles)
    if not primary_role and invitation:
        primary_role = invitation.role

    current_status = "active"
    if invitation and invitation.status == "PENDING":
        current_status = "invited"
    elif user.status and user.status != "invited":
        current_status = user.status

    return AdminUserListItem(
        id=str(user.id),
        email=user.email,
        firstname=user.firstname,
        lastname=user.lastname,
        display_name=user.display_name,
        username=user.username,
        role=primary_role,
        roles=resolved_roles,
        user_group=_classify_user_group(resolved_roles),
        status=current_status,
        kyc_status=user.kyc_status,
        invitation_status=invitation.status if invitation else None,
        invited_at=invitation.created_at if invitation else None,
        accepted_at=invitation.accepted_at if invitation else None,
        expires_at=invitation.expires_at if invitation else None,
        last_activity_at=user.updated_at or invitation.updated_at if invitation else user.updated_at,
        has_kyc_profile=has_kyc_profile,
    )


def _serialize_admin_user_detail(
    user: User,
    invitation: Optional[UserInvitation],
    *,
    roles: list[str],
    has_kyc_profile: bool,
) -> AdminUserDetailResponse:
    summary = _serialize_admin_user(
        user,
        invitation,
        roles=roles,
        has_kyc_profile=has_kyc_profile,
    )

    invitation_summary = None
    if invitation:
        invitation_summary = AdminUserInvitationSummary(
            status=invitation.status,
            invited_at=invitation.created_at,
            accepted_at=invitation.accepted_at,
            expires_at=invitation.expires_at,
            invited_email=invitation.email,
            invited_role=invitation.role,
        )

    return AdminUserDetailResponse(
        id=summary.id,
        email=summary.email,
        firstname=summary.firstname,
        lastname=summary.lastname,
        display_name=summary.display_name,
        username=summary.username,
        phone=user.phone,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=summary.role,
        roles=summary.roles,
        user_group=summary.user_group,
        status=summary.status,
        kyc_status=summary.kyc_status,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_activity_at=summary.last_activity_at,
        has_kyc_profile=summary.has_kyc_profile,
        invitation=invitation_summary,
    )


def _send_invitation_email(
    *,
    to_email: str,
    role: str,
    token: str,
):
    invite_url = f"{settings.FRONTEND_URL}/invite/accept?token={token}"
    subject = "You're invited to join LanceFy"
    body = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 12px;">You're invited to join LanceFy</h2>
      <p>You've been invited to join the LanceFy workspace as <strong>{_format_role_label(role)}</strong>.</p>
      <p>Click the button below to open your invitation and finish setting up your account.</p>
      <p style="margin: 24px 0;">
        <a
          href="{invite_url}"
          style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;"
        >
          Open invitation
        </a>
      </p>
      <p>If the button does not work, open this link in your browser:</p>
      <p><a href="{invite_url}">{invite_url}</a></p>
      <p>This invitation will expire in {settings.INVITATION_EXPIRY_HOURS} hours.</p>
    </div>
    """
    send_transactional_email(to=to_email, subject=subject, body=body)


def _get_invitation_or_404(
    db: Session,
    token: str,
) -> UserInvitation:
    invitation = (
        db.query(UserInvitation)
        .filter(UserInvitation.token == token)
        .first()
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return invitation


def _ensure_invitation_storage_ready():
    Base.metadata.create_all(bind=engine, tables=[UserInvitation.__table__], checkfirst=True)


def _ensure_invitation_is_usable(
    db: Session,
    invitation: UserInvitation,
) -> UserInvitation:
    now = datetime.utcnow()

    if invitation.status == "ACCEPTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation has already been accepted",
        )

    if invitation.expires_at <= now:
        if invitation.status != "EXPIRED":
            invitation.status = "EXPIRED"
            invitation.updated_at = now
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Invitation has expired",
        )

    return invitation


@router.get("/admin", response_model=list[AdminUserListItem])
def list_admin_users(
    _: bool = Depends(require_staff()),
    db: Session = Depends(get_db),
):
    _ensure_invitation_storage_ready()
    users = db.query(User).order_by(User.created_at.desc()).all()
    invitations = (
        db.query(UserInvitation)
        .order_by(UserInvitation.created_at.desc())
        .all()
    )

    latest_invitation_by_user: dict[str, UserInvitation] = {}
    for invitation in invitations:
        latest_invitation_by_user.setdefault(str(invitation.user_id), invitation)

    kyc_user_ids = {
        str(user_id)
        for (user_id,) in db.query(KYCProfile.user_id).all()
    }

    records = []
    for user in users:
        roles: list[str] = []
        if user.keycloak_user_id:
            try:
                roles = get_user_realm_roles(str(user.keycloak_user_id))
            except Exception:
                roles = []

        records.append(
            _serialize_admin_user(
                user,
                latest_invitation_by_user.get(str(user.id)),
                roles=roles,
                has_kyc_profile=str(user.id) in kyc_user_ids,
            )
        )

    return records


@router.get("/admin/user/{user_id}", response_model=AdminUserDetailResponse)
def get_admin_user_detail(
    user_id: UUID,
    _: bool = Depends(require_staff()),
    db: Session = Depends(get_db),
):
    _ensure_invitation_storage_ready()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    invitation = (
        db.query(UserInvitation)
        .filter(UserInvitation.user_id == user.id)
        .order_by(UserInvitation.created_at.desc())
        .first()
    )

    roles: list[str] = []
    if user.keycloak_user_id:
        try:
            roles = get_user_realm_roles(str(user.keycloak_user_id))
        except Exception:
            roles = []

    has_kyc_profile = (
        db.query(KYCProfile)
        .filter(KYCProfile.user_id == user.id)
        .first()
        is not None
    )

    return _serialize_admin_user_detail(
        user,
        invitation,
        roles=roles,
        has_kyc_profile=has_kyc_profile,
    )


@router.patch("/admin/user/{user_id}/status", response_model=AdminUserStatusUpdateResponse)
def update_admin_user_status(
    user_id: UUID,
    payload: AdminUserStatusUpdateRequest,
    admin=Depends(get_current_user),
    _: bool = Depends(require_platform_admin()),
    db: Session = Depends(get_db),
):
    _ensure_invitation_storage_ready()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own status")

    target_status = payload.status.strip().lower()
    if target_status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail="Unsupported user status")

    if user.status == "invited" and target_status == "inactive":
        raise HTTPException(status_code=400, detail="Invited users cannot be deactivated")

    if user.keycloak_user_id:
        try:
            set_user_enabled(str(user.keycloak_user_id), target_status == "active")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    user.status = target_status
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    latest_invitation = (
        db.query(UserInvitation)
        .filter(UserInvitation.user_id == user.id)
        .order_by(UserInvitation.created_at.desc())
        .first()
    )
    has_kyc_profile = (
        db.query(KYCProfile)
        .filter(KYCProfile.user_id == user.id)
        .first()
        is not None
    )
    roles: list[str] = []
    if user.keycloak_user_id:
        try:
            roles = get_user_realm_roles(str(user.keycloak_user_id))
        except Exception:
            roles = []

    return AdminUserStatusUpdateResponse(
        message="User status updated successfully",
        user=_serialize_admin_user(
            user,
            latest_invitation,
            roles=roles,
            has_kyc_profile=has_kyc_profile,
        ),
    )


@router.get("/admin/roles", response_model=list[InviteRoleOption])
def list_admin_roles(
    _: bool = Depends(require_platform_admin),
):
    role_names = {
        role["name"]
        for role in list_realm_roles()
        if role["name"] in INVITABLE_REALM_ROLES
    }

    return [
        InviteRoleOption(value=role, label=_format_role_label(role))
        for role in INVITABLE_REALM_ROLES
        if role in role_names
    ]


@router.post("/invite", response_model=InviteUserResponse)
def invite_user(
    payload: InviteUserRequest,
    inviter=Depends(get_current_user),
    _: bool = Depends(require_platform_admin),
    db: Session = Depends(get_db),
):
    _ensure_invitation_storage_ready()
    role = payload.role.strip()
    email = payload.email.strip().lower()
    logger.info("Invite request started | email=%s role=%s inviter_id=%s", email, role, getattr(inviter, "id", None))

    if role not in INVITABLE_REALM_ROLES:
        raise HTTPException(status_code=400, detail="Unsupported role")

    now = datetime.utcnow()
    expires_at = now + timedelta(hours=settings.INVITATION_EXPIRY_HOURS)
    token = secrets.token_urlsafe(32)

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user and existing_user.status not in {"invited", "inactive"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
        )

    latest_invitation = None
    if existing_user:
        latest_invitation = (
            db.query(UserInvitation)
            .filter(UserInvitation.user_id == existing_user.id)
            .order_by(UserInvitation.created_at.desc())
            .first()
        )

    try:
        if existing_user and existing_user.keycloak_user_id:
            keycloak_user_id = str(existing_user.keycloak_user_id)
            logger.info("Invite reusing existing user | email=%s user_id=%s keycloak_user_id=%s", email, existing_user.id, keycloak_user_id)
            sync_user_realm_role(
                keycloak_user_id,
                role,
                replaceable_roles=list(INVITABLE_REALM_ROLES),
            )
            user = create_or_update_invited_user(
                db,
                keycloak_user_id=keycloak_user_id,
                email=email,
            )
        else:
            keycloak_user_id = create_user_in_keycloak(
                email,
                email_verified=False,
                enabled=True,
                required_actions=[],
            )
            logger.info("Invite created keycloak user | email=%s keycloak_user_id=%s", email, keycloak_user_id)
            sync_user_realm_role(
                keycloak_user_id,
                role,
                replaceable_roles=list(INVITABLE_REALM_ROLES),
            )
            user = create_or_update_invited_user(
                db,
                keycloak_user_id=keycloak_user_id,
                email=email,
            )
        update_user_in_keycloak(
            keycloak_user_id,
            {
                "username": email,
                "email": email,
                "enabled": True,
                "emailVerified": False,
                "requiredActions": [],
            },
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Invite failed before invitation persistence | email=%s role=%s", email, role)
        raise HTTPException(status_code=400, detail=str(exc))

    if latest_invitation and latest_invitation.status != "ACCEPTED":
        latest_invitation.email = email
        latest_invitation.role = role
        latest_invitation.token = token
        latest_invitation.status = "PENDING"
        latest_invitation.invited_by = inviter.id
        latest_invitation.accepted_at = None
        latest_invitation.expires_at = expires_at
        latest_invitation.updated_at = now
        invitation = latest_invitation
    else:
        invitation = UserInvitation(
            user_id=user.id,
            email=email,
            role=role,
            token=token,
            status="PENDING",
            invited_by=inviter.id,
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )
        db.add(invitation)

    try:
        db.commit()
        db.refresh(invitation)
        logger.info(
            "Invitation persisted | invitation_id=%s email=%s role=%s status=%s",
            invitation.id,
            invitation.email,
            invitation.role,
            invitation.status,
        )
    except Exception:
        db.rollback()
        logger.exception("Invite failed while persisting invitation | email=%s role=%s", email, role)
        raise HTTPException(status_code=500, detail="Failed to save invitation")

    try:
        _send_invitation_email(to_email=email, role=role, token=token)
        logger.info("Invitation email send attempted successfully | invitation_id=%s email=%s", invitation.id, email)
    except Exception as exc:
        logger.exception("Invitation email failed | invitation_id=%s email=%s", invitation.id, email)
        raise HTTPException(
            status_code=500,
            detail=f"Invitation created, but email failed to send: {exc}",
        )

    return InviteUserResponse(
        message="Invite sent successfully",
        email=email,
        role=role,
        expires_at=invitation.expires_at,
    )


@router.get(
    "/invitations/{token}",
    response_model=InvitationPreviewResponse,
)
def get_invitation_preview(
    token: str,
    db: Session = Depends(get_db),
):
    _ensure_invitation_storage_ready()
    invitation = _get_invitation_or_404(db, token)
    invitation = _ensure_invitation_is_usable(db, invitation)

    return InvitationPreviewResponse(
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        invited_at=invitation.created_at,
        expires_at=invitation.expires_at,
    )


@router.post(
    "/invitations/{token}/accept",
    response_model=AcceptInvitationResponse,
)
def accept_invitation(
    token: str,
    payload: AcceptInvitationRequest,
    db: Session = Depends(get_db),
):
    _ensure_invitation_storage_ready()
    invitation = _get_invitation_or_404(db, token)
    invitation = _ensure_invitation_is_usable(db, invitation)

    firstname = payload.firstname.strip()
    lastname = payload.lastname.strip()
    username = payload.username.strip().lower()

    if not firstname or not lastname:
        raise HTTPException(status_code=400, detail="First name and last name are required")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if not USERNAME_PATTERN.fullmatch(username):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3-30 characters using lowercase letters, numbers, dots, underscores, or hyphens",
        )

    if len(payload.password) <= 8:
        raise HTTPException(status_code=400, detail="Password must be at least 9 characters")
    if not PASSWORD_UPPERCASE_PATTERN.search(payload.password):
        raise HTTPException(
            status_code=400,
            detail="Password must include at least one uppercase letter",
        )

    if not invitation.user or not invitation.user.keycloak_user_id:
        raise HTTPException(status_code=400, detail="Invitation user is invalid")

    username_owner = (
        db.query(User)
        .filter(
            func.lower(User.username) == username,
            User.id != invitation.user.id,
        )
        .first()
    )
    if username_owner:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already in use",
        )

    keycloak_user_id = str(invitation.user.keycloak_user_id)

    try:
        update_user_in_keycloak(
            keycloak_user_id,
            {
                "firstName": firstname,
                "lastName": lastname,
                "username": username,
                "emailVerified": True,
                "enabled": True,
                "requiredActions": [],
            },
        )
        set_user_password(
            keycloak_user_id,
            payload.password,
            temporary=False,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    now = datetime.utcnow()
    invitation.user.firstname = firstname
    invitation.user.lastname = lastname
    invitation.user.username = username
    invitation.user.status = "active"
    invitation.user.updated_at = now
    invitation.status = "ACCEPTED"
    invitation.accepted_at = now
    invitation.updated_at = now
    db.commit()

    return AcceptInvitationResponse(message="Invitation accepted successfully")
def _load_ratings_by_users(db: Session, user_ids: list) -> dict:
    """Batch load avg_rating + review_count for a list of user_ids."""
    if not user_ids:
        return {}
    rows = (
        db.query(
            Review.reviewee_id,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
        )
        .filter(Review.reviewee_id.in_(user_ids))
        .group_by(Review.reviewee_id)
        .all()
    )
    return {
        str(uid): {"avg_rating": round(float(avg), 2), "review_count": cnt}
        for uid, avg, cnt in rows
    }


def _load_skills_by_users(db: Session, user_ids: list) -> dict:
    """Batch load skills for a list of user_ids. Returns {user_id_str: [{id, name, slug}]}"""
    if not user_ids:
        return {}
    rows = (
        db.query(UserSkill.user_id, Skill.id, Skill.name, Skill.slug)
        .join(Skill, Skill.id == UserSkill.skill_id)
        .filter(UserSkill.user_id.in_(user_ids))
        .all()
    )
    result = defaultdict(list)
    for uid, sid, sname, sslug in rows:
        result[str(uid)].append({"id": str(sid), "name": sname, "slug": sslug})
    return result


def _build_profile(user: User, skill_profile, skills_list: list, rating_data: dict | None = None) -> dict:
    rd = rating_data or {}
    return {
        "id": str(user.id),
        "display_name": user.display_name,
        "firstname": user.firstname,
        "lastname": user.lastname,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "kyc_status": user.kyc_status,
        "tagline": skill_profile.tagline if skill_profile else None,
        "skills": skills_list,
        "hourly_rate": skill_profile.hourly_rate if skill_profile else None,
        "is_public": skill_profile.is_public if skill_profile else False,
        "avg_rating": rd.get("avg_rating", None),
        "review_count": rd.get("review_count", 0),
    }


@router.get("/public")
def list_public_freelancers(
    search: Optional[str] = Query(default=None),
    skill: Optional[str] = Query(default=None),
    skills: Optional[str] = Query(default=None, description="Comma-separated skill names (OR logic)"),
    sort: str = Query(default="newest"),
    kyc_verified: bool = Query(default=True),  # FIX-14/15: show only KYC-verified by default
    rate_min: Optional[int] = Query(default=None, ge=0),
    rate_max: Optional[int] = Query(default=None, ge=0),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Browse freelancers who set is_public=True in their freelance skill profile."""
    q = (
        db.query(User, UserFreelanceSkill)
        .join(UserFreelanceSkill, UserFreelanceSkill.user_id == User.id)
        .filter(UserFreelanceSkill.is_public == True)
    )

    if search:
        term = f"%{search}%"
        q = q.filter(
            User.display_name.ilike(term)
            | User.firstname.ilike(term)
            | User.lastname.ilike(term)
            | User.username.ilike(term)
        )

    # `skills` (comma-sep) takes priority over single `skill`
    if skills:
        skill_list = [s.strip() for s in skills.split(",") if s.strip()]
        from sqlalchemy import or_ as _or
        skill_subq = (
            db.query(UserSkill.user_id)
            .join(Skill, Skill.id == UserSkill.skill_id)
            .filter(_or(*[Skill.name.ilike(s) for s in skill_list]))
            .subquery()
        )
        q = q.filter(User.id.in_(skill_subq))
    elif skill:
        skill_subq = (
            db.query(UserSkill.user_id)
            .join(Skill, Skill.id == UserSkill.skill_id)
            .filter(
                (Skill.slug == skill.lower()) | Skill.name.ilike(skill)
            )
            .subquery()
        )
        q = q.filter(User.id.in_(skill_subq))

    if kyc_verified:
        q = q.filter(User.kyc_status == "verified")

    if rate_min is not None:
        q = q.filter(UserFreelanceSkill.hourly_rate >= rate_min)
    if rate_max is not None:
        q = q.filter(UserFreelanceSkill.hourly_rate <= rate_max)

    total = q.count()

    if sort == "rate_asc":
        q = q.order_by(UserFreelanceSkill.hourly_rate.asc().nullslast())
    elif sort == "rate_desc":
        q = q.order_by(UserFreelanceSkill.hourly_rate.desc().nullslast())
    elif sort == "rating_desc":
        # sub-select avg rating per user for ordering
        from sqlalchemy import func as _func
        from app.reviews.models import Review as _Review
        avg_sub = (
            db.query(_Review.reviewee_id, _func.avg(_Review.rating).label("avg_r"))
            .group_by(_Review.reviewee_id)
            .subquery()
        )
        q = q.outerjoin(avg_sub, avg_sub.c.reviewee_id == User.id).order_by(
            avg_sub.c.avg_r.desc().nullslast()
        )
    else:
        q = q.order_by(User.created_at.desc())

    rows = q.offset((page - 1) * limit).limit(limit).all()
    user_ids = [u.id for u, _ in rows]
    skills_map = _load_skills_by_users(db, user_ids)
    ratings_map = _load_ratings_by_users(db, user_ids)
    return {
        "data": [
            _build_profile(u, s, skills_map.get(str(u.id), []), ratings_map.get(str(u.id)))
            for u, s in rows
        ],
        "total": total,
    }


@router.get("/me/skills")
def get_my_skills(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's skill list."""
    rows = (
        db.query(Skill)
        .join(UserSkill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == current_user.id)
        .order_by(Skill.name)
        .all()
    )
    return {"data": [{"id": str(s.id), "name": s.name, "slug": s.slug} for s in rows]}


@router.put("/me/skills")
def set_my_skills(
    payload: SetSkillsRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace all skills for the current user. Pass an empty list to clear."""
    if payload.skill_ids:
        skills = db.query(Skill).filter(Skill.id.in_(payload.skill_ids)).all()
        if len(skills) != len(set(payload.skill_ids)):
            raise HTTPException(status_code=400, detail="One or more skill IDs are invalid")
    else:
        skills = []

    db.query(UserSkill).filter(UserSkill.user_id == current_user.id).delete()
    now = datetime.utcnow()
    for s in skills:
        db.add(UserSkill(user_id=current_user.id, skill_id=s.id, created_at=now))
    db.commit()
    return {"data": [{"id": str(s.id), "name": s.name, "slug": s.slug} for s in skills]}


@router.patch("/me/freelance-profile")
def update_freelance_profile(
    payload: FreelanceProfileUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """สร้างหรืออัปเดต freelancer profile (tagline, hourly_rate, is_public)."""
    profile = (
        db.query(UserFreelanceSkill)
        .filter(UserFreelanceSkill.user_id == current_user.id)
        .first()
    )
    now = datetime.utcnow()
    if profile is None:
        profile = UserFreelanceSkill(user_id=current_user.id, created_at=now)
        db.add(profile)

    if payload.tagline is not None:
        profile.tagline = payload.tagline
    if payload.hourly_rate is not None:
        profile.hourly_rate = payload.hourly_rate
    if payload.is_public is not None:
        if payload.is_public and current_user.kyc_status != "verified":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="KYC verification is required before making profile public",
            )
        profile.is_public = payload.is_public
    profile.updated_at = now
    db.commit()
    db.refresh(profile)

    return {
        "tagline": profile.tagline,
        "hourly_rate": float(profile.hourly_rate) if profile.hourly_rate is not None else None,
        "is_public": profile.is_public,
    }


@router.get("/{user_id}/public")
def get_public_user_profile(user_id: UUID, db: Session = Depends(get_db)):
    """Get any user's public profile (freelancers + clients - used by project detail etc.)."""
    row = (
        db.query(User, UserFreelanceSkill)
        .outerjoin(UserFreelanceSkill, UserFreelanceSkill.user_id == User.id)
        .filter(User.id == user_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    user, skill_profile = row
    if user.status != "active":
        raise HTTPException(status_code=404, detail="User not found")
    if skill_profile and skill_profile.is_public is False:
        raise HTTPException(status_code=404, detail="User not found")
    skills_map = _load_skills_by_users(db, [user.id])
    ratings_map = _load_ratings_by_users(db, [user.id])
    return _build_profile(user, skill_profile, skills_map.get(str(user.id), []), ratings_map.get(str(user.id)))
