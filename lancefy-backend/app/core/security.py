import asyncio
import logging
import time

import requests
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

JWKS_URL = (
    f"{settings.KEYCLOAK_URL}/realms/"
    f"{settings.KEYCLOAK_REALM}/protocol/openid-connect/certs"
)
_issuer_base_url = settings.KEYCLOAK_ISSUER_URL or settings.KEYCLOAK_URL
KEYCLOAK_ISSUER = f"{_issuer_base_url}/realms/{settings.KEYCLOAK_REALM}"

_jwks_cache: dict = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 600


def _parse_csv_setting(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    return tuple(item.strip() for item in value.split(",") if item.strip())


def _expected_audiences() -> tuple[str, ...]:
    configured = _parse_csv_setting(settings.KEYCLOAK_ALLOWED_AUDIENCES)
    if configured:
        return configured
    return (settings.KEYCLOAK_CLIENT_ID,)


def _validate_audience_claim(payload: dict) -> None:
    if not settings.KEYCLOAK_VERIFY_AUDIENCE:
        return

    token_audience = payload.get("aud")
    if isinstance(token_audience, str):
        token_audiences = {token_audience}
    elif isinstance(token_audience, (list, tuple, set)):
        token_audiences = {item for item in token_audience if isinstance(item, str)}
    else:
        token_audiences = set()

    expected = set(_expected_audiences())
    if not token_audiences or token_audiences.isdisjoint(expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
        )


def _validate_authorized_party(payload: dict) -> None:
    allowed_azp = set(_parse_csv_setting(settings.KEYCLOAK_ALLOWED_AZP))
    if not allowed_azp:
        return

    authorized_party = payload.get("azp")
    if not isinstance(authorized_party, str) or authorized_party not in allowed_azp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token authorized party",
        )


def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.monotonic()
    if not _jwks_cache or (now - _jwks_fetched_at) > _JWKS_TTL:
        try:
            resp = requests.get(JWKS_URL, timeout=10)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            _jwks_fetched_at = now
        except (requests.RequestException, ValueError) as exc:
            logger.error("Failed to fetch JWKS: %s", exc)
            if not _jwks_cache:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Auth service unavailable",
                )
    return _jwks_cache


def _decode_token(token: str, jwks: dict) -> dict:
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
        )

    key = next((item for item in jwks.get("keys", []) if item.get("kid") == kid), None)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Public key not found",
        )

    should_verify_audience = settings.KEYCLOAK_VERIFY_AUDIENCE and len(_expected_audiences()) == 1

    payload = jwt.decode(
        token,
        key,
        algorithms=["RS256"],
        options={
            "verify_aud": should_verify_audience,
            "require_aud": settings.KEYCLOAK_VERIFY_AUDIENCE,
            "verify_iss": True,
        },
        audience=_expected_audiences()[0] if should_verify_audience else None,
        issuer=KEYCLOAK_ISSUER,
    )
    if settings.KEYCLOAK_VERIFY_AUDIENCE and not should_verify_audience:
        _validate_audience_claim(payload)
    _validate_authorized_party(payload)
    return payload


async def get_jwks_async() -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _get_jwks)


async def verify_token_async(token: str) -> dict:
    jwks = await get_jwks_async()
    try:
        try:
            return _decode_token(token, jwks)
        except HTTPException as exc:
            if exc.detail != "Public key not found":
                raise
            global _jwks_fetched_at
            _jwks_fetched_at = 0.0
            jwks = await get_jwks_async()
            return _decode_token(token, jwks)
    except JWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def verify_token(token: str) -> dict:
    jwks = _get_jwks()
    try:
        try:
            return _decode_token(token, jwks)
        except HTTPException as exc:
            if exc.detail != "Public key not found":
                raise
            global _jwks_fetched_at
            _jwks_fetched_at = 0.0
            jwks = _get_jwks()
            return _decode_token(token, jwks)
    except JWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
