from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.auth.deps import get_current_user, require_staff

from app.kyc.schemas import (
    KYCSubmitSchema,
    KYCStatusResponseSchema,
    KYCReviewSchema,
    KYCProfileResponseSchema,
    KYCDocumentUploadResponseSchema,
    KYCListItemSchema,
    KYCDetailSchema,
)

from app.kyc.service import (
    submit_kyc,
    upload_id_card,
    upload_selfie,
    get_kyc_status,
    list_admin_kyc,
    list_pending_kyc,
    get_kyc_detail,
    review_kyc,
)
from app.notifications.routes import create_notification_sync

router = APIRouter(prefix="/kyc", tags=["KYC"])


@router.post(
    "/submit",
    response_model=KYCProfileResponseSchema,
    summary="ยื่นข้อมูล KYC",
    description=(
        "ผู้ใช้ส่งข้อมูลส่วนตัวเพื่อเริ่มกระบวนการยืนยันตัวตน (KYC) "
        "สร้าง KYC Profile ในระบบพร้อมสถานะ `PENDING`\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def submit(
    payload: KYCSubmitSchema,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return submit_kyc(db, user.id, payload)


@router.post(
    "/upload-id-card",
    response_model=KYCDocumentUploadResponseSchema,
    summary="อัปโหลดรูปบัตรประชาชน",
    description=(
        "อัปโหลดไฟล์รูปภาพบัตรประชาชนสำหรับการยืนยันตัวตน\n\n"
        "- รองรับไฟล์ประเภท: `image/jpeg`, `image/png`, `image/webp`\n"
        "- ต้องระบุ `profile_id` ที่ได้จาก endpoint `/kyc/submit`\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
async def upload_id(
    profile_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return await upload_id_card(db, user.id, profile_id, file)


@router.post(
    "/upload-selfie",
    response_model=KYCDocumentUploadResponseSchema,
    summary="อัปโหลดรูปเซลฟี่คู่บัตร",
    description=(
        "อัปโหลดไฟล์รูปภาพเซลฟี่ถือบัตรประชาชนสำหรับการยืนยันตัวตน\n\n"
        "- รองรับไฟล์ประเภท: `image/jpeg`, `image/png`, `image/webp`\n"
        "- ต้องระบุ `profile_id` ที่ได้จาก endpoint `/kyc/submit`\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
async def upload_selfie_doc(
    profile_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return await upload_selfie(db, user.id, profile_id, file)


@router.get(
    "/status",
    response_model=KYCStatusResponseSchema,
    summary="ตรวจสอบสถานะ KYC ของตัวเอง",
    description=(
        "ดึงสถานะการยืนยันตัวตนของผู้ใช้ที่ล็อกอินอยู่\n\n"
        "**สถานะที่เป็นไปได้:** `PENDING` | `APPROVED` | `REJECTED` | `NEEDS_RESUBMISSION`\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def status(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_kyc_status(db, user.id)


@router.get(
    "/admin",
    response_model=list[KYCListItemSchema],
    summary="[Admin] ดูรายการ KYC ทั้งหมด",
    description=(
        "Staff/Admin ดูรายการ KYC ของผู้ใช้ทั้งหมดในระบบ\n\n"
        "- กรองด้วย query param `status` เช่น `?status=PENDING`\n"
        "- ถ้าไม่ระบุ `status` จะดึงทั้งหมด\n\n"
        "**ต้องการ:** Bearer Token + Role `staff` หรือ `admin`"
    ),
)
def admin_list(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _=Depends(require_staff()),
):
    return list_admin_kyc(db, status)


@router.get(
    "/admin/pending",
    response_model=list[KYCListItemSchema],
    summary="[Admin] ดูรายการ KYC ที่รอตรวจสอบ",
    description=(
        "Staff/Admin ดูเฉพาะรายการ KYC ที่มีสถานะ `PENDING` รอการตรวจสอบเท่านั้น\n\n"
        "**ต้องการ:** Bearer Token + Role `staff` หรือ `admin`"
    ),
)
def pending(
    db: Session = Depends(get_db),
    _=Depends(require_staff()),
):
    return list_pending_kyc(db)


@router.get(
    "/admin/{user_id}",
    response_model=KYCDetailSchema,
    summary="[Admin] ดูรายละเอียด KYC ของผู้ใช้",
    description=(
        "Staff/Admin ดูข้อมูล KYC ทั้งหมดของผู้ใช้คนใดคนหนึ่ง รวมถึงเอกสารที่อัปโหลด\n\n"
        "**ต้องการ:** Bearer Token + Role `staff` หรือ `admin`"
    ),
)
def detail(
    user_id: UUID,
    db: Session = Depends(get_db),
    _=Depends(require_staff()),
):
    return get_kyc_detail(db, user_id)


@router.patch(
    "/admin/{user_id}/review",
    response_model=KYCStatusResponseSchema,
    summary="[Admin] อนุมัติหรือปฏิเสธ KYC",
    description=(
        "Staff/Admin ตรวจสอบและอัปเดตสถานะ KYC ของผู้ใช้\n\n"
        "**สถานะที่ตั้งได้:**\n"
        "- `APPROVED` — อนุมัติผ่าน ผู้ใช้จะได้รับ notification แจ้งเตือน\n"
        "- `REJECTED` — ปฏิเสธ ต้องระบุ `reason`\n"
        "- `NEEDS_RESUBMISSION` — ขอเอกสารเพิ่มเติม\n\n"
        "ระบบจะส่ง notification อัตโนมัติให้ผู้ใช้เมื่อสถานะเปลี่ยน\n\n"
        "**ต้องการ:** Bearer Token + Role `staff` หรือ `admin`"
    ),
)
def review(
    user_id: UUID,
    payload: KYCReviewSchema,
    db: Session = Depends(get_db),
    reviewer=Depends(get_current_user),
    _=Depends(require_staff()),
):
    result = review_kyc(db, user_id, payload, reviewer.id)
    status_val = result.get("status", "") if isinstance(result, dict) else getattr(result, "status", "")

    _NOTIF = {
        "APPROVED": (
            "kyc_approved",
            "การยืนยันตัวตนผ่านแล้ว ✅",
            "บัญชีของคุณได้รับการยืนยันตัวตนเรียบร้อยแล้ว คุณสามารถรับงานได้แล้ว",
        ),
        "REJECTED": (
            "kyc_rejected",
            "การยืนยันตัวตนไม่ผ่าน",
            None,  # body set below from reason
        ),
        "NEEDS_RESUBMISSION": (
            "kyc_needs_resubmission",
            "กรุณายื่นเอกสารยืนยันตัวตนใหม่",
            None,
        ),
    }

    if status_val in _NOTIF:
        notif_type, title, body = _NOTIF[status_val]
        if body is None:
            reason = result.get("reason") if isinstance(result, dict) else getattr(result, "reason", None)
            body = f"เหตุผล: {reason}" if reason else "กรุณาตรวจสอบเอกสารและลองใหม่อีกครั้ง"
        try:
            create_notification_sync(
                db, user_id, notif_type, title, body,
                reference_type="kyc", reference_id=user_id,
            )
        except Exception:
            pass

    return result
