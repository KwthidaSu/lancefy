from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.database import get_db
from app.projects import service
from app.projects.schemas import (
    AcceptOfferSchema,
    CalendarEventsResponse,
    MilestoneCreateSchema,
    MilestoneResequenceItemSchema,
    MilestonePlanReviewSchema,
    MilestoneResponseSchema,
    MilestoneSubmissionResponseSchema,
    MilestoneUpdateSchema,
    PaginatedProjectResponse,
    ProjectOfferCompatibilitySchema,
    ProjectPayoutSummarySchema,
    ProjectResponseSchema,
    ReviewSubmissionSchema,
    SubmitMilestoneSchema,
)
from app.users.models import User

router = APIRouter(prefix="/projects", tags=["Projects"])


# ─────────────────────────────────────────────────────────────────
# Calendar  (ต้องอยู่ก่อน /{project_id} เพื่อไม่ให้ path conflict)
# ─────────────────────────────────────────────────────────────────

@router.get(
    "/calendar",
    response_model=CalendarEventsResponse,
    summary="ดู Calendar Events ของตัวเอง",
    description=(
        "ดึง events ทั้งหมดที่เกี่ยวข้องกับผู้ใช้ เช่น deadline ของ milestone และวันส่งงาน\n\n"
        "- กรองด้วย `month` และ `year` หากต้องการดูเฉพาะเดือน\n"
        "- ไม่ระบุ = ดึง events ทั้งหมดโดยไม่กรองเดือน\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def get_calendar_events(
    month: Optional[int] = Query(None, ge=1, le=12, description="1–12, ไม่ส่ง = ทั้งหมด"),
    year: Optional[int] = Query(None, ge=2020, description="เช่น 2026, ไม่ส่ง = ทั้งหมด"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    events = service.get_calendar_events(
        db, user_id=current_user.id, month=month, year=year
    )
    return {"data": events}


# ─────────────────────────────────────────────────────────────────
# Projects
# ─────────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=PaginatedProjectResponse,
    summary="ดูรายการโปรเจกต์ของตัวเอง",
    description=(
        "ดึงรายการโปรเจกต์ที่ผู้ใช้เป็น client หรือ freelancer\n\n"
        "- กรองด้วย `status`: `active` | `completed` | `cancelled` | `disputed`\n"
        "- กรองด้วย `role`: `client` | `freelancer`\n"
        "- ค้นหาด้วย `search` (ชื่อโปรเจกต์)\n"
        "- รองรับ pagination ด้วย `page` และ `page_size`\n\n"
        "**ต้องการ:** Bearer Token (ผู้ใช้ที่ล็อกอินแล้ว)"
    ),
)
def list_my_projects(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    role: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_projects(
        db, user_id=current_user.id, status=status, search=search, page=page, page_size=page_size, role=role
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponseSchema,
    summary="ดูรายละเอียดโปรเจกต์",
    description=(
        "ดึงข้อมูลโปรเจกต์ทั้งหมด รวม milestones และข้อมูล client/freelancer\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_project(db, project_id=project_id, user_id=current_user.id)


@router.get(
    "/{project_id}/offers",
    response_model=list[ProjectOfferCompatibilitySchema],
    summary="ดู offers/proposals ของโปรเจกต์",
    description=(
        "Compatibility route สำหรับหน้า project เดิมที่ยังอ่านข้อมูล offers\n\n"
        "- ถ้าโปรเจกต์ผูกกับ job จะ map จาก proposals ของ job นั้น\n"
        "- ถ้าโปรเจกต์ผูกกับ accepted proposal จะคืน proposal นั้นในรูปแบบ offer\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def get_project_offers(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_project_offers(
        db,
        project_id=project_id,
        user_id=current_user.id,
    )


@router.get(
    "/{project_id}/payouts/summary",
    response_model=ProjectPayoutSummarySchema,
    summary="ดูสรุปการจ่ายเงินของโปรเจกต์",
    description=(
        "ดึงยอดรวม milestone ของโปรเจกต์ แยกเป็น funded, released และ remaining\n\n"
        "- ใช้สำหรับหน้า workspace/manage/detail เพื่อแสดง payment summary\n"
        "- `milestones` จะคืน funding status และยอดที่ปล่อยแล้วของแต่ละ milestone\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def get_project_payout_summary(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_project_payout_summary(
        db,
        project_id=project_id,
        user_id=current_user.id,
    )


@router.post(
    "/{project_id}/offers/{offer_id}/accept",
    response_model=ProjectResponseSchema,
    summary="ยอมรับ milestone offer ของโปรเจกต์",
    description=(
        "Compatibility route สำหรับหน้า deal/project เก่าใน frontend\n\n"
        "- ใช้ payload milestone offer เพื่อสร้าง milestone plan และเริ่มโปรเจกต์\n"
        "- ผู้ใช้ที่เรียกต้องเป็น client ของโปรเจกต์นั้น\n\n"
        "**ต้องการ:** Bearer Token และ payload แบบ AcceptOfferSchema"
    ),
)
def accept_project_offer(
    project_id: UUID,
    offer_id: UUID,
    payload: AcceptOfferSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.accept_offer(
        db=db,
        project_id=project_id,
        offer_id=offer_id,
        client_id=current_user.id,
        payload=payload,
    )


@router.get(
    "/{project_id}/workspace",
    summary="ดู Workspace ของโปรเจกต์",
    description=(
        "ดึงข้อมูลรวมสำหรับหน้า Workspace ได้แก่ project, assignment, และ milestones ในครั้งเดียว\n\n"
        "- ใช้สำหรับ render หน้า Workspace ใน frontend\n"
        "- `status` ของ assignment จะแปลง `active` → `in_progress` โดยอัตโนมัติ\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def get_project_workspace(
    project_id: UUID,
    lang: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = lang
    project = service.get_project(db, project_id=project_id, user_id=current_user.id)
    milestones = service.list_milestones(db, project_id=project_id, user_id=current_user.id)
    return {
        "project": project,
        "assignment": {
            "id": str(project.id),
            "job_id": str(project.job_id) if project.job_id else str(project.id),
            "client_id": str(project.client_id),
            "freelancer_id": str(project.freelancer_id) if project.freelancer_id else None,
            "status": "in_progress" if project.status == "active" else project.status,
            "completed_at": project.completed_at,
            "client_completion_confirmed_at": project.client_completion_confirmed_at,
            "freelancer_completion_confirmed_at": project.freelancer_completion_confirmed_at,
            "created_at": project.created_at,
        },
        "milestones": milestones,
    }


@router.get(
    "/{project_id}/milestone-board",
    response_model=list[MilestoneResponseSchema],
    summary="ดู Milestone Board",
    description=(
        "ดึงรายการ milestones ทั้งหมดในโปรเจกต์ เรียงตาม sequence\n\n"
        "ใช้สำหรับแสดงภาพรวมความคืบหน้าของงานในรูปแบบ board\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def milestone_board(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_milestones(db, project_id=project_id, user_id=current_user.id)


@router.post(
    "/{project_id}/complete",
    response_model=ProjectResponseSchema,
    summary="ยืนยันความเสร็จสิ้นของโปรเจกต์",
    description=(
        "Client หรือ Freelancer กดยืนยันว่างานเสร็จสิ้นแล้ว\n\n"
        "- ต้องกดยืนยันทั้ง 2 ฝ่าย โปรเจกต์จึงจะเปลี่ยนสถานะเป็น `completed`\n"
        "- ระบบจะบันทึกเวลายืนยันของแต่ละฝ่ายแยกกัน\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def complete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.complete_project(db, project_id=project_id, user_id=current_user.id)


@router.post(
    "/{project_id}/completion/confirm",
    response_model=ProjectResponseSchema,
    deprecated=True,
    summary="[Deprecated] ใช้ POST /{project_id}/complete แทน",
)
def confirm_project_completion(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deprecated — redirect logic ไปที่ /complete เพื่อ backward compatibility"""
    return service.complete_project(db, project_id=project_id, user_id=current_user.id)


@router.post(
    "/{project_id}/cancel",
    response_model=ProjectResponseSchema,
    summary="ยกเลิกโปรเจกต์",
    description=(
        "ยกเลิกโปรเจกต์และเปลี่ยนสถานะเป็น `cancelled`\n\n"
        "- milestones ที่ยังไม่ได้ชำระเงินจะถูก refund คืน client\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def cancel_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.cancel_project(db, project_id=project_id, user_id=current_user.id)


# ─────────────────────────────────────────────────────────────────
# Milestones
# ─────────────────────────────────────────────────────────────────

@router.get(
    "/{project_id}/milestones",
    response_model=list[MilestoneResponseSchema],
    summary="ดูรายการ Milestones",
    description=(
        "ดึง milestones ทั้งหมดของโปรเจกต์ เรียงตาม sequence\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def list_milestones(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_milestones(db, project_id=project_id, user_id=current_user.id)


@router.post(
    "/{project_id}/milestones",
    response_model=MilestoneResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="สร้าง Milestone ใหม่",
    description=(
        "เพิ่ม milestone ใหม่เข้าไปในโปรเจกต์\n\n"
        "- ระบุ `title`, `amount`, `due_date`, และ `sequence`\n"
        "- sequence น้อย = แสดงก่อน\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็น client ของโปรเจกต์นั้น"
    ),
)
def create_milestone(
    project_id: UUID,
    payload: MilestoneCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.create_milestone(db, project_id=project_id, user_id=current_user.id, payload=payload)


@router.patch(
    "/{project_id}/milestones/{milestone_id}",
    response_model=MilestoneResponseSchema,
    summary="แก้ไข Milestone",
    description=(
        "อัปเดตข้อมูล milestone เช่น ชื่อ, มูลค่า, วันกำหนดส่ง\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็น client ของโปรเจกต์นั้น"
    ),
)
def update_milestone(
    project_id: UUID,
    milestone_id: UUID,
    payload: MilestoneUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.update_milestone(
        db, project_id=project_id, milestone_id=milestone_id, user_id=current_user.id, payload=payload
    )


@router.delete(
    "/{project_id}/milestones/{milestone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="ลบ Milestone",
    description=(
        "ลบ milestone ออกจากโปรเจกต์\n\n"
        "- ลบได้เฉพาะ milestone ที่ยังไม่มีการส่งงาน\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็น client ของโปรเจกต์นั้น"
    ),
)
def delete_milestone(
    project_id: UUID,
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service.delete_milestone(db, project_id=project_id, milestone_id=milestone_id, user_id=current_user.id)


@router.post(
    "/{project_id}/milestones/resequence",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="จัดลำดับ Milestones ใหม่",
    description=(
        "อัปเดต sequence ของ milestones หลายอันพร้อมกัน\n\n"
        "- ส่ง array ของ `{id, sequence}` เพื่อกำหนดลำดับใหม่\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็น client ของโปรเจกต์นั้น"
    ),
)
def resequence_milestones(
    project_id: UUID,
    payload: list[MilestoneResequenceItemSchema],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service.resequence_milestones(db, project_id=project_id, user_id=current_user.id, items=payload)


@router.post(
    "/{project_id}/milestones/plan/propose",
    response_model=ProjectResponseSchema,
    summary="เสนอแผน Milestone",
    description=(
        "เสนอ milestone plan ให้อีกฝ่ายอนุมัติ\n\n"
        "- ระบบจะตั้ง `milestone_plan_pending = true` และบันทึกว่าใครเป็นผู้เสนอ\n"
        "- อีกฝ่ายต้อง approve/reject ผ่าน `/milestones/plan/review`\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def propose_milestone_plan(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.propose_milestone_plan(db, project_id=project_id, user_id=current_user.id)


@router.post(
    "/{project_id}/milestones/plan/review",
    summary="อนุมัติหรือปฏิเสธแผน Milestone",
    description=(
        "อีกฝ่ายอนุมัติหรือปฏิเสธแผน milestone ที่ถูกเสนอมา\n\n"
        "- `approved` → `milestone_plan_pending` กลับเป็น `false`\n"
        "- `rejected` → แผนถูกยกเลิก ฝ่ายที่เสนอต้องเสนอใหม่\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def review_milestone_plan(
    project_id: UUID,
    payload: MilestonePlanReviewSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.review_milestone_plan(db, project_id=project_id, user_id=current_user.id, payload=payload)


# ─────────────────────────────────────────────────────────────────
# Submissions
# ─────────────────────────────────────────────────────────────────

@router.get(
    "/{project_id}/milestones/{milestone_id}/submissions",
    response_model=list[MilestoneSubmissionResponseSchema],
    summary="ดูรายการการส่งงานของ Milestone",
    description=(
        "ดึงประวัติการส่งงานทั้งหมดของ milestone รวมทุก revision\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็นคู่กรณีของโปรเจกต์นั้น"
    ),
)
def list_submissions(
    project_id: UUID,
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_submissions(
        db, project_id=project_id, milestone_id=milestone_id, user_id=current_user.id
    )


@router.post(
    "/{project_id}/milestones/{milestone_id}/submissions",
    response_model=MilestoneSubmissionResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="ส่งงาน Milestone",
    description=(
        "Freelancer ส่งงานสำหรับ milestone พร้อมแนบไฟล์และข้อความ\n\n"
        "- ส่งได้หลายรอบ แต่ละรอบ `revision_number` จะเพิ่มขึ้น\n"
        "- สถานะ milestone จะเปลี่ยนเป็น `submitted` โดยอัตโนมัติ\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็น freelancer ของโปรเจกต์นั้น"
    ),
)
def submit_milestone(
    project_id: UUID,
    milestone_id: UUID,
    payload: SubmitMilestoneSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.submit_milestone(
        db,
        project_id=project_id,
        milestone_id=milestone_id,
        freelancer_id=current_user.id,
        payload=payload,
    )


@router.patch(
    "/{project_id}/milestones/{milestone_id}/submissions/{submission_id}/review",
    response_model=MilestoneSubmissionResponseSchema,
    summary="ตรวจงาน Milestone (Client)",
    description=(
        "Client ตรวจงานและอนุมัติหรือขอแก้ไข\n\n"
        "- `approved` → milestone เปลี่ยนเป็น `approved` รอชำระเงิน\n"
        "- `revision_requested` → freelancer ต้องส่งงานใหม่\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็น client ของโปรเจกต์นั้น"
    ),
)
def review_submission(
    project_id: UUID,
    milestone_id: UUID,
    submission_id: UUID,
    payload: ReviewSubmissionSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.review_submission(
        db,
        project_id=project_id,
        milestone_id=milestone_id,
        submission_id=submission_id,
        client_id=current_user.id,
        payload=payload,
    )


@router.post(
    "/{project_id}/milestones/{milestone_id}/payment",
    summary="ปล่อยเงิน Milestone",
    description=(
        "ปล่อยเงิน escrow ของ milestone ให้ freelancer หลัง client อนุมัติงาน\n\n"
        "- milestone ต้องมีสถานะ `approved` ก่อนถึงจะปล่อยเงินได้\n"
        "- สถานะ funding จะเปลี่ยนจาก `funded` → `released`\n\n"
        "**ต้องการ:** Bearer Token และต้องเป็น client ของโปรเจกต์นั้น"
    ),
)
def release_milestone_payment(
    project_id: UUID,
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.release_milestone_payment(
        db=db,
        project_id=project_id,
        milestone_id=milestone_id,
        user_id=current_user.id,
    )
