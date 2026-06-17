from datetime import date, datetime, time, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.deps import require_platform_admin
from app.audit.models import AuditLog, ActivityLog
from app.core.database import get_db

router = APIRouter(prefix="/audit", tags=["Audit (Admin)"])


def _parse_date_filter(value: Optional[str], field_name: str) -> Optional[date]:
    if value is None:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}; expected YYYY-MM-DD") from exc


@router.get("/logs")
def list_audit_logs(
    _: bool = Depends(require_platform_admin),
    db: Session = Depends(get_db),
    user_id: Optional[UUID] = Query(None, description="filter by actor user_id"),
    action: Optional[str] = Query(None, description="filter by action e.g. admin.user_ban"),
    resource_type: Optional[str] = Query(None, description="filter by resource_type e.g. dispute"),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD inclusive"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD inclusive"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """Admin-only: list security/compliance audit logs."""
    q = db.query(AuditLog)

    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if resource_type:
        q = q.filter(AuditLog.resource_type == resource_type)

    parsed_date_from = _parse_date_filter(date_from, "date_from")
    parsed_date_to = _parse_date_filter(date_to, "date_to")
    if parsed_date_from:
        q = q.filter(AuditLog.created_at >= datetime.combine(parsed_date_from, time.min))
    if parsed_date_to:
        end = datetime.combine(parsed_date_to + timedelta(days=1), time.min)
        q = q.filter(AuditLog.created_at < end)

    total = q.count()
    rows = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "data": [
            {
                "id": str(r.id),
                "user_id": str(r.user_id) if r.user_id else None,
                "action": r.action,
                "resource_type": r.resource_type,
                "resource_id": str(r.resource_id) if r.resource_id else None,
                "old_value": r.old_value,
                "new_value": r.new_value,
                "ip_address": str(r.ip_address) if r.ip_address else None,
                "user_agent": r.user_agent,
                "extra_data": r.extra_data,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/activity")
def list_activity_logs(
    _: bool = Depends(require_platform_admin),
    db: Session = Depends(get_db),
    actor_id: Optional[UUID] = Query(None, description="filter by actor user_id"),
    event: Optional[str] = Query(None, description="filter by event e.g. project.completed"),
    subject_type: Optional[str] = Query(None, description="filter by subject_type e.g. project"),
    subject_id: Optional[UUID] = Query(None, description="filter by subject entity id"),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD inclusive"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD inclusive"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """Admin-only: list business activity logs (project timeline events)."""
    q = db.query(ActivityLog)

    if actor_id:
        q = q.filter(ActivityLog.actor_id == actor_id)
    if event:
        q = q.filter(ActivityLog.event == event)
    if subject_type:
        q = q.filter(ActivityLog.subject_type == subject_type)
    if subject_id:
        q = q.filter(ActivityLog.subject_id == subject_id)

    parsed_date_from = _parse_date_filter(date_from, "date_from")
    parsed_date_to = _parse_date_filter(date_to, "date_to")
    if parsed_date_from:
        q = q.filter(ActivityLog.created_at >= datetime.combine(parsed_date_from, time.min))
    if parsed_date_to:
        end = datetime.combine(parsed_date_to + timedelta(days=1), time.min)
        q = q.filter(ActivityLog.created_at < end)

    total = q.count()
    rows = (
        q.order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "data": [
            {
                "id": str(r.id),
                "actor_id": str(r.actor_id) if r.actor_id else None,
                "event": r.event,
                "subject_type": r.subject_type,
                "subject_id": str(r.subject_id) if r.subject_id else None,
                "snapshot": r.snapshot,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
