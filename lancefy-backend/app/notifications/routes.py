from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.core.security import verify_token, verify_token_async
from app.auth.deps import get_current_user
from app.users.service import get_or_create_user
from app.notifications.models import Notification, NotificationSetting
from app.notifications.schemas import (
    NotificationResponseSchema, PaginatedNotificationsResponse,
    NotificationSettingSchema, NotificationSettingsResponse, NotificationSettingUpdate,
)
from app.notifications.manager import notification_manager

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ---------------------------------------------------------------------------
# Helpers — importable by other modules to create notifications
# ---------------------------------------------------------------------------

def _is_in_app_enabled(db: Session, user_id, notification_type: str) -> bool:
    """Return True if in-app notification is enabled for this user+type.
    Missing row = default enabled."""
    row = db.query(NotificationSetting).filter(
        NotificationSetting.user_id == user_id,
        NotificationSetting.notification_type == notification_type,
    ).first()
    return row.in_app_enabled if row else True


def _push_ws_sync(notif: Notification) -> None:
    """Fire-and-forget best-effort WS push from a sync context."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(
                notification_manager.push(
                    str(notif.user_id),
                    {
                        "id": str(notif.id),
                        "type": notif.type,
                        "title": notif.title,
                        "body": notif.body,
                        "reference_type": notif.reference_type,
                        "reference_id": notif.reference_id,
                        "is_read": notif.is_read,
                        "created_at": notif.created_at.isoformat(),
                    },
                )
            )
    except Exception:
        pass


def create_notification_sync(
    db: Session,
    user_id,
    type: str,
    title: str,
    body: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
) -> Optional[Notification]:
    """
    Synchronous helper — safe to call from sync FastAPI route handlers.
    Checks in_app_enabled from NotificationSetting before inserting.
    Also attempts a real-time WS push after saving.

    Usage (wrap in try/except so notification failure never breaks caller):
        try:
            create_notification_sync(db, user_id, "proposal_received", ...)
        except Exception:
            pass
    """
    if not _is_in_app_enabled(db, user_id, type):
        return None

    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id else None,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    _push_ws_sync(notif)
    return notif


async def create_and_push_notification(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    body: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
) -> Optional[Notification]:
    """
    Async version — checks in_app_enabled, inserts, then pushes via WS.
    """
    if not _is_in_app_enabled(db, user_id, type):
        return None

    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id else None,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    try:
        await notification_manager.push(
            str(user_id),
            {
                "id": str(notif.id),
                "type": notif.type,
                "title": notif.title,
                "body": notif.body,
                "reference_type": notif.reference_type,
                "reference_id": notif.reference_id,
                "is_read": notif.is_read,
                "created_at": notif.created_at.isoformat(),
            },
        )
    except Exception:
        pass

    return notif


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedNotificationsResponse)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    # "read" | "unread" | omit → all
    read_filter: Optional[str] = Query(None, description="read | unread"),
    # any NotificationType value, e.g. "offer_received"
    type_filter: Optional[str] = Query(None, description="notification type"),
    # YYYY-MM-DD  e.g. "2026-03-01"
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD start date (inclusive)"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD end date (inclusive)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List the current user's notifications, newest first. Supports filtering."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)

    if read_filter == "unread":
        q = q.filter(Notification.is_read == False)  # noqa: E712
    elif read_filter == "read":
        q = q.filter(Notification.is_read == True)   # noqa: E712

    if type_filter:
        q = q.filter(Notification.type == type_filter)

    if date_from:
        try:
            q = q.filter(Notification.created_at >= datetime.fromisoformat(date_from))
        except Exception:
            pass

    if date_to:
        try:
            from datetime import timedelta
            end = datetime.fromisoformat(date_to) + timedelta(days=1)
            q = q.filter(Notification.created_at < end)
        except Exception:
            pass

    total = q.count()
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .count()
    )

    data = (
        q.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "data": data,
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
    }


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a single notification."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"ok": True}


@router.delete("")
def delete_notifications(
    read_only: bool = Query(False, description="Delete only read notifications"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Bulk delete — all or read-only."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if read_only:
        q = q.filter(Notification.is_read == True)  # noqa: E712
    q.delete(synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.post("/{notification_id}/read", response_model=NotificationResponseSchema)
def mark_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark all of the current user's notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


# ---------------------------------------------------------------------------
# Notification Settings
# ---------------------------------------------------------------------------

# All supported types — default: all enabled
_ALL_TYPES = [
    "proposal_received", "proposal_accepted", "proposal_rejected", "proposal_withdrawn",
    "job_expired", "deal_opened", "project_created",
    "work_submitted", "work_approved", "work_rejected",
    "payment_funded", "payment_released", "payout_processed",
    "message_received", "kyc_approved", "kyc_rejected",
    "dispute_opened", "dispute_resolved",
]


@router.get("/settings", response_model=NotificationSettingsResponse)
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return per-type notification preferences. Missing rows = all enabled."""
    rows = db.query(NotificationSetting).filter(
        NotificationSetting.user_id == current_user.id
    ).all()
    saved = {r.notification_type: r for r in rows}
    result = {}
    for t in _ALL_TYPES:
        if t in saved:
            result[t] = NotificationSettingSchema(
                notification_type=t,
                in_app_enabled=saved[t].in_app_enabled,
                email_enabled=saved[t].email_enabled,
            )
        else:
            result[t] = NotificationSettingSchema(
                notification_type=t,
                in_app_enabled=True,
                email_enabled=True,
            )
    return NotificationSettingsResponse(settings=result)


@router.patch("/settings", response_model=NotificationSettingsResponse)
def update_notification_settings(
    body: NotificationSettingUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Upsert notification preferences for supplied types."""
    import uuid as _uuid
    for upd in body.updates:
        row = db.query(NotificationSetting).filter(
            NotificationSetting.user_id == current_user.id,
            NotificationSetting.notification_type == upd.notification_type,
        ).first()
        if row:
            row.in_app_enabled = upd.in_app_enabled
            row.email_enabled = upd.email_enabled
        else:
            row = NotificationSetting(
                id=_uuid.uuid4(),
                user_id=current_user.id,
                notification_type=upd.notification_type,
                in_app_enabled=upd.in_app_enabled,
                email_enabled=upd.email_enabled,
            )
            db.add(row)
    db.commit()
    return get_notification_settings(db=db, current_user=current_user)


# ---------------------------------------------------------------------------
# WebSocket endpoint — real-time push (Section 12)
# ---------------------------------------------------------------------------

@router.websocket("/ws")
async def notification_ws(
    websocket: WebSocket,
    token: str = Query(..., description="Keycloak JWT passed as query param"),
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for real-time in-app notification delivery.

    The client authenticates by passing the Keycloak JWT as ?token=<jwt>.
    On connection the server sends any unread notifications so the client
    can initialise its badge count without a separate REST call.
    """
    # Authenticate via JWT query param (WS cannot carry HTTP Authorization header)
    # Must accept() first — calling close() before accept() returns HTTP 403
    # which the browser reports as "Unexpected response code: 403".
    await websocket.accept()
    try:
        payload = await verify_token_async(token)
        keycloak_user_id = payload.get("sub")
        if not keycloak_user_id:
            await websocket.close(code=4001, reason="Missing sub claim")
            return
        user = get_or_create_user(
            db,
            keycloak_user_id=keycloak_user_id,
            email=payload.get("email"),
            firstname=payload.get("given_name"),
            lastname=payload.get("family_name"),
            username=payload.get("preferred_username"),
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("notification_ws: auth failed: %s", e)
        await websocket.close(code=4001, reason="Authentication failed")
        return

    user_id = str(user.id)
    await notification_manager.connect(user_id, websocket)

    # Send unread notifications on connect so the client can bootstrap state
    try:
        unread = (
            db.query(Notification)
            .filter(Notification.user_id == user.id, Notification.is_read == False)
            .order_by(Notification.created_at.desc())
            .limit(50)
            .all()
        )
        for n in unread:
            try:
                await websocket.send_json({
                    "id": str(n.id),
                    "type": n.type,
                    "title": n.title,
                    "body": n.body,
                    "reference_type": n.reference_type,
                    "reference_id": n.reference_id,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                })
            except Exception:
                break
    except Exception as e:
        # DB schema mismatch or other query error — log but keep connection alive
        import logging
        logging.getLogger(__name__).warning("notification_ws: failed to load unread notifications: %s", e)

    try:
        while True:
            # Keep connection alive; client may send {"action": "ping"}
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        notification_manager.disconnect(user_id, websocket)
