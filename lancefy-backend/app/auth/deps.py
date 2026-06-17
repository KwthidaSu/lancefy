from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.core.security import verify_token
from app.core.database import get_db
from app.users.service import get_or_create_user

security = HTTPBearer()
_optional_security = HTTPBearer(auto_error=False)


def _ensure_user_is_active(user):
    if getattr(user, "status", None) == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive",
        )
    return user


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    payload = verify_token(creds.credentials)

    keycloak_user_id = payload.get("sub")
    if not keycloak_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = get_or_create_user(
        db,
        keycloak_user_id=keycloak_user_id,
        email=payload.get("email"),
        firstname=payload.get("given_name"),
        lastname=payload.get("family_name"),
        username=payload.get("preferred_username"),
    )
    return _ensure_user_is_active(user)


def require_roles(*allowed_roles: str):

    def checker(
        creds: HTTPAuthorizationCredentials = Depends(security),
    ):
        payload = verify_token(creds.credentials)
        roles = payload.get("realm_access", {}).get("roles", [])

        if not roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No roles found in token",
            )

        if not any(role in roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )

        return True

    return checker


def require_user():
    return require_roles("user")


def require_staff():
    return require_roles("staff", "platform_admin")


def require_platform_admin():
    return require_roles("platform_admin")


def get_jwt_roles(
    creds: HTTPAuthorizationCredentials = Depends(security),
) -> list:
    """Return realm roles from the JWT without raising on absence.
    Useful for optional admin checks alongside party-based access control.
    """
    try:
        payload = verify_token(creds.credentials)
        return payload.get("realm_access", {}).get("roles", [])
    except HTTPException:
        return []


def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_optional_security),
    db: Session = Depends(get_db),
):
    """Return the authenticated user if a valid token is provided, else None."""
    if not creds:
        return None
    try:
        payload = verify_token(creds.credentials)
        keycloak_user_id = payload.get("sub")
        if not keycloak_user_id:
            return None
        user = get_or_create_user(
            db,
            keycloak_user_id=keycloak_user_id,
            email=payload.get("email"),
            firstname=payload.get("given_name"),
            lastname=payload.get("family_name"),
            username=payload.get("preferred_username"),
        )
        return _ensure_user_is_active(user)
    except HTTPException:
        return None
