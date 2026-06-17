from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from minio.error import S3Error
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import engine
from app.services.minio_client import BUCKET_NAME, minio_client

router = APIRouter(tags=["Health"])


def _check_database() -> str:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return "ok"


def _check_storage() -> str:
    if not minio_client.bucket_exists(BUCKET_NAME):
        return "missing_bucket"
    return "ok"


def _readiness_payload() -> tuple[dict, int]:
    checks: dict[str, str] = {}
    is_ready = True

    try:
        checks["database"] = _check_database()
    except SQLAlchemyError:
        checks["database"] = "error"
        is_ready = False

    try:
        checks["storage"] = _check_storage()
        is_ready = is_ready and checks["storage"] == "ok"
    except (RuntimeError, S3Error, OSError, ValueError):
        checks["storage"] = "error"
        is_ready = False

    payload = {
        "status": "ok" if is_ready else "degraded",
        "checks": checks,
    }
    return payload, status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE


@router.get("/health")
def health_summary():
    payload, status_code = _readiness_payload()
    return JSONResponse(status_code=status_code, content=payload)


@router.get("/health/live")
def health_live():
    return {"status": "ok"}


@router.get("/health/ready")
def health_ready():
    payload, status_code = _readiness_payload()
    return JSONResponse(status_code=status_code, content=payload)
