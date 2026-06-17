from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_platform_admin
from app.core.database import get_db
from app.disputes import service
from app.disputes.schemas import (
    DisputeMarkStatusSchema,
    DisputeMessageCreateSchema,
    DisputeMessageResponseSchema,
    DisputeOpenSchema,
    DisputeResponseSchema,
    DisputeResolveSchema,
    EvidenceCreateSchema,
    EvidenceResponseSchema,
)
from app.users.models import User

router = APIRouter(prefix="/disputes", tags=["Disputes"])


@router.post(
    "",
    response_model=DisputeResponseSchema,
    status_code=201,
    summary="เปิด Dispute",
    description=(
        "ผู้ใช้เปิด Dispute เพื่อร้องเรียนหรือขอคืนเงินจากโปรเจกต์ที่มีปัญหา\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def open_dispute(
    payload: DisputeOpenSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.open_dispute(db, user_id=current_user.id, payload=payload)


@router.get(
    "",
    response_model=list[DisputeResponseSchema],
    summary="ดู Dispute ของตัวเอง",
    description=(
        "ดึงรายการ Dispute ทั้งหมดที่ผู้ใช้ที่ล็อกอินอยู่เป็นคู่กรณี\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def list_my_disputes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_my_disputes(db, user_id=current_user.id)


@router.get(
    "/admin",
    response_model=list[DisputeResponseSchema],
    summary="[Admin] ดูรายการ Dispute ทั้งหมด",
    description=(
        "Platform Admin ดูรายการ Dispute ทั้งหมดในระบบ\n\n"
        "- กรองด้วย query param `status` เช่น `?status=open` | `reviewing` | `resolved`\n"
        "- ถ้าไม่ระบุ `status` จะดึงทั้งหมด\n\n"
        "**ต้องการ:** Bearer Token + Role `platform_admin`"
    ),
)
def admin_list_disputes(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_platform_admin()),
):
    return service.list_admin_disputes(db, status=status)


@router.get(
    "/admin/{dispute_id}",
    response_model=DisputeResponseSchema,
    summary="[Admin] ดูรายละเอียด Dispute",
    description=(
        "Platform Admin ดูรายละเอียดของ Dispute ใดก็ได้ในระบบ รวมถึง evidence และ messages\n\n"
        "**ต้องการ:** Bearer Token + Role `platform_admin`"
    ),
)
def admin_get_dispute(
    dispute_id: UUID,
    db: Session = Depends(get_db),
    _=Depends(require_platform_admin()),
):
    return service.get_dispute_admin(db, dispute_id=dispute_id)


@router.patch(
    "/{dispute_id}/status",
    response_model=DisputeResponseSchema,
    summary="[Admin] อัปเดตสถานะ Dispute",
    description=(
        "Platform Admin อัปเดตสถานะ Dispute\n\n"
        "- ขณะนี้รองรับเฉพาะ `status: \"reviewing\"` เพื่อเริ่มกระบวนการตรวจสอบ\n\n"
        "**ต้องการ:** Bearer Token + Role `platform_admin`"
    ),
    dependencies=[Depends(require_platform_admin)],
)
def update_dispute_status(
    dispute_id: UUID,
    payload: DisputeMarkStatusSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.status == "reviewing":
        return service.mark_reviewing(db, dispute_id=dispute_id, admin_id=current_user.id)
    from fastapi import HTTPException
    raise HTTPException(status_code=400, detail="Invalid status. Use 'reviewing'")


@router.get(
    "/{dispute_id}",
    response_model=DisputeResponseSchema,
    summary="ดูรายละเอียด Dispute ของตัวเอง",
    description=(
        "ดึงรายละเอียด Dispute ที่ผู้ใช้เป็นคู่กรณี (client หรือ freelancer)\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def get_dispute(
    dispute_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_dispute(db, dispute_id=dispute_id, user_id=current_user.id)


@router.post(
    "/{dispute_id}/evidence",
    response_model=EvidenceResponseSchema,
    status_code=201,
    summary="แนบหลักฐานใน Dispute",
    description=(
        "ผู้ใช้ที่เป็นคู่กรณีสามารถแนบหลักฐาน (URL หรือข้อความ) เพื่อประกอบการพิจารณา\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def add_evidence(
    dispute_id: UUID,
    payload: EvidenceCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.add_evidence(db, dispute_id=dispute_id, user_id=current_user.id, payload=payload)


@router.patch(
    "/{dispute_id}/resolve",
    response_model=DisputeResponseSchema,
    summary="[Admin] ตัดสิน Dispute",
    description=(
        "Platform Admin ตัดสินผล Dispute พร้อมระบุผู้ชนะและเหตุผล\n\n"
        "ระบบจะดำเนินการคืนเงิน/โอนเงินตามผลการตัดสิน\n\n"
        "**ต้องการ:** Bearer Token + Role `platform_admin`"
    ),
    dependencies=[Depends(require_platform_admin)],
)
def resolve_dispute(
    dispute_id: UUID,
    payload: DisputeResolveSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.resolve_dispute(db, dispute_id=dispute_id, admin_id=current_user.id, payload=payload)


# ── Messages ──────────────────────────────────────────────────────

@router.get(
    "/{dispute_id}/messages",
    response_model=list[DisputeMessageResponseSchema],
    summary="ดูข้อความใน Dispute",
    description=(
        "ดึงรายการข้อความสนทนาภายใน Dispute สำหรับคู่กรณี\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def list_messages(
    dispute_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_messages(db, dispute_id=dispute_id, user_id=current_user.id, is_admin=False)


@router.get(
    "/admin/{dispute_id}/messages",
    response_model=list[DisputeMessageResponseSchema],
    summary="[Admin] ดูข้อความใน Dispute",
    description=(
        "Platform Admin ดูรายการข้อความสนทนาทั้งหมดภายใน Dispute\n\n"
        "**ต้องการ:** Bearer Token + Role `platform_admin`"
    ),
    dependencies=[Depends(require_platform_admin)],
)
def admin_list_messages(
    dispute_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_messages(db, dispute_id=dispute_id, user_id=current_user.id, is_admin=True)


@router.post(
    "/{dispute_id}/messages",
    response_model=DisputeMessageResponseSchema,
    status_code=201,
    summary="ส่งข้อความใน Dispute",
    description=(
        "คู่กรณีส่งข้อความสนทนาภายใน Dispute\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def send_message(
    dispute_id: UUID,
    payload: DisputeMessageCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.send_message(db, dispute_id=dispute_id, sender_id=current_user.id, payload=payload, is_admin=False)


@router.post(
    "/admin/{dispute_id}/messages",
    response_model=DisputeMessageResponseSchema,
    status_code=201,
    summary="[Admin] ส่งข้อความใน Dispute",
    description=(
        "Platform Admin ส่งข้อความเข้าไปในการสนทนา Dispute\n\n"
        "**ต้องการ:** Bearer Token + Role `platform_admin`"
    ),
    dependencies=[Depends(require_platform_admin)],
)
def admin_send_message(
    dispute_id: UUID,
    payload: DisputeMessageCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.send_message(db, dispute_id=dispute_id, sender_id=current_user.id, payload=payload, is_admin=True)
