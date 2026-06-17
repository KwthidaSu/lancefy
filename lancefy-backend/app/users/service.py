import uuid
from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import func
from sqlalchemy.orm import Session

from app.users.models import User


def normalize_keycloak_user_id(
    keycloak_user_id: str | uuid.UUID,
) -> uuid.UUID:
    if isinstance(keycloak_user_id, uuid.UUID):
        return keycloak_user_id
    return uuid.UUID(str(keycloak_user_id))


def _normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    normalized = email.strip().lower()
    return normalized or None


def _sync_user_from_identity(
    user: User,
    *,
    normalized_keycloak_id: uuid.UUID,
    email: str | None,
    firstname: str | None,
    lastname: str | None,
    username: str | None,
) -> bool:
    updated = False

    if user.keycloak_user_id != normalized_keycloak_id:
        user.keycloak_user_id = normalized_keycloak_id
        updated = True

    if firstname and user.firstname != firstname:
        user.firstname = firstname
        updated = True
    if lastname and user.lastname != lastname:
        user.lastname = lastname
        updated = True
    if username and user.username != username:
        user.username = username
        updated = True
    if email and user.email != email:
        user.email = email
        updated = True

    if not user.display_name:
        parts = [p for p in [user.firstname, user.lastname] if p]
        if parts:
            user.display_name = " ".join(parts)
            updated = True

    return updated


def _find_existing_user_for_identity(
    db: Session,
    *,
    normalized_keycloak_id: uuid.UUID,
    email: str | None,
    username: str | None,
) -> User | None:
    user = (
        db.query(User)
        .filter(User.keycloak_user_id == normalized_keycloak_id)
        .first()
    )
    if user:
        return user

    if email:
        user = (
            db.query(User)
            .filter(func.lower(User.email) == email)
            .first()
        )
        if user:
            return user

    if username:
        user = (
            db.query(User)
            .filter(func.lower(User.username) == username.lower())
            .first()
        )
        if user:
            return user

    return None

def get_or_create_user(
    db: Session,
    keycloak_user_id: str,
    email: str | None,
    firstname: str | None,
    lastname: str | None,
    username: str | None,
):
    normalized_keycloak_id = normalize_keycloak_user_id(keycloak_user_id)
    normalized_email = _normalize_email(email)
    user = _find_existing_user_for_identity(
        db,
        normalized_keycloak_id=normalized_keycloak_id,
        email=normalized_email,
        username=username,
    )

    if user:
        # Sync profile fields from Keycloak token on every login.
        now = datetime.utcnow()
        updated = _sync_user_from_identity(
            user,
            normalized_keycloak_id=normalized_keycloak_id,
            email=normalized_email,
            firstname=firstname,
            lastname=lastname,
            username=username,
        )
        if updated:
            user.updated_at = now
        if updated:
            db.commit()
            db.refresh(user)
        return user

    now = datetime.utcnow()
    # Fallback: some Keycloak configs don't send given_name — use username or
    # the local part of email so firstname is never stored as a blank string.
    resolved_firstname = firstname or (username or (email or "").split("@")[0]) or None
    auto_display = " ".join(p for p in [resolved_firstname, lastname] if p) or None
    user = User(
        id=uuid.uuid4(),
        keycloak_user_id=normalized_keycloak_id,
        email=normalized_email,
        status="active",
        firstname=resolved_firstname,
        lastname=lastname,
        username=username,
        display_name=auto_display,
        created_at=now,
        updated_at=now,
    )

    db.add(user)
    try:
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        # Another request may have inserted or relinked the user concurrently.
        db.rollback()
        existing_user = _find_existing_user_for_identity(
            db,
            normalized_keycloak_id=normalized_keycloak_id,
            email=normalized_email,
            username=username,
        )
        if existing_user:
            updated = _sync_user_from_identity(
                existing_user,
                normalized_keycloak_id=normalized_keycloak_id,
                email=normalized_email,
                firstname=firstname,
                lastname=lastname,
                username=username,
            )
            if updated:
                existing_user.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_user)
            return existing_user
        raise


def create_or_update_invited_user(
    db: Session,
    *,
    keycloak_user_id: str,
    email: str,
) -> User:
    user = db.query(User).filter(User.email == email).first()

    now = datetime.utcnow()
    normalized_keycloak_id = normalize_keycloak_user_id(keycloak_user_id)

    if user:
        user.keycloak_user_id = normalized_keycloak_id
        user.email = email
        user.status = "invited"
        user.updated_at = now
        db.flush()
        return user

    user = User(
        id=uuid.uuid4(),
        keycloak_user_id=normalized_keycloak_id,
        email=email,
        status="invited",
        created_at=now,
        updated_at=now,
    )

    db.add(user)
    db.flush()
    return user
