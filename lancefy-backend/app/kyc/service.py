import traceback
from datetime import datetime
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.files.models import File
from app.kyc.models import (
    KYCIDCard,
    KYCAuditActorType,
    KYCAuditEvent,
    KYCAuditLog,
    KYCProfile,
    KYCSelfie,
)
from app.services.keycloak_admin import assign_freelancer_role
from app.services.minio_client import ensure_bucket, upload_bytes
from app.users.models import User


MAX_KYC_FILE_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_KYC_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}

PUBLIC_TO_DB_STATUS = {
    "PENDING": "pending",
    "APPROVED": "verified",
    "REJECTED": "rejected",
    "NEEDS_RESUBMISSION": "needs_resubmission",
}
DB_TO_PUBLIC_STATUS = {
    "pending": "PENDING",
    "verified": "APPROVED",
    "rejected": "REJECTED",
    "needs_resubmission": "NEEDS_RESUBMISSION",
}
RESUBMITTABLE_DB_STATUSES = {"rejected", "needs_resubmission"}
REVIEWABLE_PUBLIC_STATUSES = {"APPROVED", "REJECTED", "NEEDS_RESUBMISSION"}
USER_KYC_STATUS_MAP = {
    "PENDING": "pending",
    "APPROVED": "verified",
    "REJECTED": "rejected",
    "NEEDS_RESUBMISSION": "rejected",
}


def _public_status(db_status: str | None) -> str:
    if not db_status:
        return "NOT_SUBMITTED"
    return DB_TO_PUBLIC_STATUS.get(db_status.lower(), "NOT_SUBMITTED")


def _normalize_filter_status(status: str | None) -> str | None:
    if not status:
        return None

    normalized = status.strip().upper()
    if normalized == "NOT_SUBMITTED":
        return None

    return PUBLIC_TO_DB_STATUS.get(normalized, status.strip().lower())


def get_kyc_profile(db: Session, user_id: UUID) -> KYCProfile | None:
    return db.query(KYCProfile).filter(KYCProfile.user_id == user_id).first()


def ensure_kyc_owner(profile: KYCProfile, user_id: UUID) -> None:
    if profile.user_id != user_id:
        raise HTTPException(status_code=403, detail="You do not have access to this KYC profile")


def ensure_review_reason(reason: str | None, status: str) -> str | None:
    if status not in {"REJECTED", "NEEDS_RESUBMISSION"}:
        return None

    normalized_reason = (reason or "").strip()
    if not normalized_reason:
        raise HTTPException(status_code=400, detail="A review reason is required for this action")

    return normalized_reason


def validate_upload_file(file: UploadFile, content: bytes) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")

    if file.content_type not in ALLOWED_KYC_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(content) > MAX_KYC_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Uploaded file is too large")


def _documents_are_complete(db: Session, profile_id: UUID) -> bool:
    id_card = db.query(KYCIDCard).filter(KYCIDCard.kyc_profile_id == profile_id).first()
    selfie = db.query(KYCSelfie).filter(KYCSelfie.kyc_profile_id == profile_id).first()
    return bool(
        id_card
        and id_card.front_image_file_id
        and selfie
        and selfie.image_file_id
    )


def ensure_documents_complete(db: Session, profile_id: UUID) -> None:
    if not _documents_are_complete(db, profile_id):
        raise HTTPException(status_code=400, detail="KYC documents are incomplete")


def _log_kyc_event(
    db: Session,
    *,
    profile: KYCProfile,
    event_type: KYCAuditEvent,
    actor_type: KYCAuditActorType,
    actor_user_id: UUID | None = None,
    from_status: str | None = None,
    to_status: str | None = None,
    note: str | None = None,
    extra_data: dict | None = None,
    created_at: datetime | None = None,
) -> None:
    db.add(
        KYCAuditLog(
            kyc_profile_id=profile.id,
            user_id=profile.user_id,
            actor_user_id=actor_user_id,
            actor_type=actor_type.value,
            event_type=event_type.value,
            from_status=from_status,
            to_status=to_status,
            note=note,
            extra_data=extra_data or {},
            created_at=created_at or datetime.utcnow(),
        )
    )


def _serialize_kyc_timeline(db: Session, profile: KYCProfile) -> list[dict]:
    logs = (
        db.query(KYCAuditLog)
        .filter(KYCAuditLog.kyc_profile_id == profile.id)
        .order_by(KYCAuditLog.created_at.asc())
        .all()
    )
    actor_ids = {log.actor_user_id for log in logs if log.actor_user_id}
    actor_map = {
        user.id: user
        for user in db.query(User).filter(User.id.in_(actor_ids)).all()
    } if actor_ids else {}

    def actor_name_for(log: KYCAuditLog) -> str | None:
        if not log.actor_user_id:
            return "System" if log.actor_type == KYCAuditActorType.SYSTEM.value else None
        actor = actor_map.get(log.actor_user_id)
        if not actor:
            return None
        full_name = " ".join(part for part in [actor.firstname, actor.lastname] if part).strip()
        return full_name or actor.display_name or actor.email or actor.username

    return [
        {
            "id": log.id,
            "event_type": log.event_type,
            "actor_type": log.actor_type,
            "actor_name": actor_name_for(log),
            "note": log.note,
            "extra_data": log.extra_data,
            "created_at": log.created_at,
        }
        for log in logs
    ]


def _upload_kyc_file(
    db: Session,
    *,
    owner_id: UUID,
    profile_id: UUID,
    file: UploadFile,
    content: bytes,
) -> File:
    ensure_bucket()

    object_name = f"kyc/{owner_id}/{uuid4()}-{file.filename}"
    file_url = upload_bytes(content, object_name, content_type=file.content_type or "application/octet-stream")

    record = File(
        id=uuid4(),
        owner_id=owner_id,
        original_name=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        storage_provider="minio",
        storage_path=object_name,
        file_url=file_url,
        context="kyc",
        context_id=str(profile_id),
        is_temporary=False,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.flush()
    return record


def submit_kyc(db: Session, user_id: UUID, payload):
    now = datetime.utcnow()
    profile = get_kyc_profile(db, user_id)
    previous_status = profile.status if profile else None

    if profile and profile.status not in RESUBMITTABLE_DB_STATUSES:
        raise HTTPException(status_code=409, detail="KYC already submitted")

    if profile:
        profile.full_name = payload.full_name
        profile.citizen_id = payload.citizen_id
        profile.date_of_birth = payload.date_of_birth
        profile.country = payload.country
        profile.address = payload.address
        profile.status = "pending"
        profile.reviewed_by = None
        profile.review_note = None
        profile.reviewed_at = None
        # Reuse created_at as latest submission timestamp for the current UI/API shape.
        profile.created_at = now
        profile.updated_at = now
    else:
        profile = KYCProfile(
            user_id=user_id,
            full_name=payload.full_name,
            citizen_id=payload.citizen_id,
            date_of_birth=payload.date_of_birth,
            country=payload.country,
            address=payload.address,
            status="pending",
            created_at=now,
            updated_at=now,
        )
        db.add(profile)

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.kyc_status = USER_KYC_STATUS_MAP["PENDING"]
        user.updated_at = now

    db.flush()
    _log_kyc_event(
        db,
        profile=profile,
        event_type=KYCAuditEvent.SUBMITTED,
        actor_type=KYCAuditActorType.USER,
        actor_user_id=user_id,
        from_status=previous_status,
        to_status=profile.status,
        created_at=now,
    )

    db.commit()
    db.refresh(profile)
    return profile


def get_profile_for_upload(db: Session, profile_id: UUID, user_id: UUID) -> KYCProfile:
    profile = db.query(KYCProfile).filter(KYCProfile.id == profile_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    ensure_kyc_owner(profile, user_id)
    return profile


async def upload_id_card(db: Session, user_id: UUID, profile_id: UUID, file: UploadFile):
    profile = get_profile_for_upload(db, profile_id, user_id)
    if profile.status == "verified":
        raise HTTPException(status_code=400, detail="Approved KYC cannot be modified")

    was_complete = _documents_are_complete(db, profile.id)
    content = await file.read()
    validate_upload_file(file, content)
    new_file = _upload_kyc_file(db, owner_id=profile.user_id, profile_id=profile.id, file=file, content=content)

    existing = db.query(KYCIDCard).filter(KYCIDCard.kyc_profile_id == profile.id).first()
    now = datetime.utcnow()
    replaced = bool(existing and existing.front_image_file_id)
    if existing:
        existing.front_image_file_id = new_file.id
        existing.created_at = now
    else:
        db.add(
            KYCIDCard(
                kyc_profile_id=profile.id,
                front_image_file_id=new_file.id,
                created_at=now,
            )
        )

    db.flush()
    _log_kyc_event(
        db,
        profile=profile,
        event_type=KYCAuditEvent.ID_CARD_UPLOADED,
        actor_type=KYCAuditActorType.USER,
        actor_user_id=user_id,
        note=file.filename,
        extra_data={
            "file_id": str(new_file.id),
            "file_url": new_file.file_url,
            "mime_type": new_file.mime_type,
            "replaced": replaced,
        },
        created_at=now,
    )
    if not was_complete and _documents_are_complete(db, profile.id):
        _log_kyc_event(
            db,
            profile=profile,
            event_type=KYCAuditEvent.DOCUMENTS_COMPLETED,
            actor_type=KYCAuditActorType.USER,
            actor_user_id=user_id,
            created_at=now,
        )

    db.commit()
    return {
        "message": "ID card uploaded",
        "file_id": new_file.id,
        "url": new_file.file_url,
    }


async def upload_selfie(db: Session, user_id: UUID, profile_id: UUID, file: UploadFile):
    profile = get_profile_for_upload(db, profile_id, user_id)
    if profile.status == "verified":
        raise HTTPException(status_code=400, detail="Approved KYC cannot be modified")

    was_complete = _documents_are_complete(db, profile.id)
    content = await file.read()
    validate_upload_file(file, content)
    new_file = _upload_kyc_file(db, owner_id=profile.user_id, profile_id=profile.id, file=file, content=content)

    existing = db.query(KYCSelfie).filter(KYCSelfie.kyc_profile_id == profile.id).first()
    now = datetime.utcnow()
    replaced = bool(existing and existing.image_file_id)
    if existing:
        existing.image_file_id = new_file.id
        existing.created_at = now
    else:
        db.add(
            KYCSelfie(
                kyc_profile_id=profile.id,
                image_file_id=new_file.id,
                created_at=now,
            )
        )

    db.flush()
    _log_kyc_event(
        db,
        profile=profile,
        event_type=KYCAuditEvent.SELFIE_UPLOADED,
        actor_type=KYCAuditActorType.USER,
        actor_user_id=user_id,
        note=file.filename,
        extra_data={
            "file_id": str(new_file.id),
            "file_url": new_file.file_url,
            "mime_type": new_file.mime_type,
            "replaced": replaced,
        },
        created_at=now,
    )
    if not was_complete and _documents_are_complete(db, profile.id):
        _log_kyc_event(
            db,
            profile=profile,
            event_type=KYCAuditEvent.DOCUMENTS_COMPLETED,
            actor_type=KYCAuditActorType.USER,
            actor_user_id=user_id,
            created_at=now,
        )

    db.commit()
    return {
        "message": "Selfie uploaded",
        "file_id": new_file.id,
        "url": new_file.file_url,
    }


def get_kyc_status(db: Session, user_id: UUID):
    profile = get_kyc_profile(db, user_id)

    if not profile:
        return {
            "status": "NOT_SUBMITTED",
            "reason": None,
            "submitted_at": None,
            "reviewed_at": None,
        }

    return {
        "status": _public_status(profile.status),
        "reason": profile.review_note,
        "submitted_at": profile.created_at,
        "reviewed_at": profile.reviewed_at,
    }


def list_admin_kyc(db: Session, status: str | None = None):
    query = (
        db.query(KYCProfile, User.email)
        .outerjoin(User, User.id == KYCProfile.user_id)
        .order_by(KYCProfile.created_at.desc())
    )

    normalized_status = _normalize_filter_status(status)
    if normalized_status:
        query = query.filter(KYCProfile.status == normalized_status)

    rows = query.all()
    return [
        {
            "user_id": profile.user_id,
            "full_name": profile.full_name,
            "email": email,
            "citizen_id": profile.citizen_id,
            "status": _public_status(profile.status),
            "created_at": profile.created_at,
        }
        for profile, email in rows
    ]


def list_pending_kyc(db: Session):
    return list_admin_kyc(db, "PENDING")


def get_kyc_detail(db: Session, user_id: UUID):
    profile = get_kyc_profile(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="KYC profile not found")

    user = db.query(User).filter(User.id == user_id).first()
    id_card = db.query(KYCIDCard).filter(KYCIDCard.kyc_profile_id == profile.id).first()
    selfie = db.query(KYCSelfie).filter(KYCSelfie.kyc_profile_id == profile.id).first()

    id_card_file = None
    if id_card:
        id_card_file = db.query(File).filter(File.id == id_card.front_image_file_id).first()

    selfie_file = None
    if selfie:
        selfie_file = db.query(File).filter(File.id == selfie.image_file_id).first()

    return {
        "user_id": profile.user_id,
        "email": user.email if user else None,
        "profile": profile,
        "id_card": {
            "file_id": id_card.front_image_file_id,
            "url": id_card_file.file_url if id_card_file else None,
            "created_at": id_card.created_at,
        }
        if id_card
        else None,
        "selfie": {
            "file_id": selfie.image_file_id,
            "url": selfie_file.file_url if selfie_file else None,
            "created_at": selfie.created_at,
        }
        if selfie
        else None,
        "status": _public_status(profile.status),
        "reason": profile.review_note,
        "submitted_at": profile.created_at,
        "reviewed_at": profile.reviewed_at,
        "timeline": _serialize_kyc_timeline(db, profile),
    }


def review_kyc(db: Session, user_id: UUID, payload, reviewer_id: UUID):
    try:
        profile = get_kyc_profile(db, user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="KYC profile not found")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        public_status = payload.status.value if hasattr(payload.status, "value") else str(payload.status)
        public_status = public_status.upper()
        if public_status not in REVIEWABLE_PUBLIC_STATUSES:
            raise HTTPException(status_code=400, detail="Unsupported review status")

        reason = ensure_review_reason(payload.reason, public_status)
        if public_status == "APPROVED":
            ensure_documents_complete(db, profile.id)

        now = datetime.utcnow()
        previous_status = profile.status
        profile.status = PUBLIC_TO_DB_STATUS[public_status]
        profile.review_note = reason
        profile.reviewed_by = reviewer_id
        profile.reviewed_at = now
        profile.updated_at = now
        user.kyc_status = USER_KYC_STATUS_MAP[public_status]
        user.updated_at = now

        if public_status == "APPROVED":
            if not user.keycloak_user_id:
                raise HTTPException(status_code=400, detail="User does not have keycloak_user_id")

            try:
                assign_freelancer_role(str(user.keycloak_user_id))
            except Exception as exc:
                db.rollback()
                traceback.print_exc()
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to assign freelancer role: {exc}",
                )

        _log_kyc_event(
            db,
            profile=profile,
            event_type=(
                KYCAuditEvent.APPROVED
                if public_status == "APPROVED"
                else KYCAuditEvent.REJECTED
                if public_status == "REJECTED"
                else KYCAuditEvent.NEEDS_RESUBMISSION
            ),
            actor_type=KYCAuditActorType.ADMIN,
            actor_user_id=reviewer_id,
            from_status=previous_status,
            to_status=profile.status,
            note=reason,
            created_at=now,
        )

        db.commit()
        db.refresh(profile)

        return {
            "status": public_status,
            "reason": profile.review_note,
            "submitted_at": profile.created_at,
            "reviewed_at": profile.reviewed_at,
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to review KYC: {exc}")
