from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from datetime import datetime, timedelta

from app.core.database import get_db
from app.auth.deps import get_current_user
from app.core.sla import SLA
from app.reviews.models import Review
from app.reviews.schemas import ReviewCreateSchema, ReviewResponseSchema, ReviewStatusSchema
from app.projects.models import Project, ProjectStatus
from app.users.models import User

router = APIRouter(prefix="/reviews", tags=["reviews"])


# ──────────────────────────────────────────────────────────────────────────────
# POST /reviews
#   สร้าง review หลังโปรเจกต์จบ
#   - ต้องเป็น client หรือ freelancer ของโปรเจกต์นั้นเท่านั้น
#   - โปรเจกต์ต้องอยู่ใน status COMPLETED
#   - reviewee ต้องเป็นอีกฝ่าย (client → เขียนให้ freelancer / freelancer → เขียนให้ client)
#   - unique per project per reviewer — review ซ้ำไม่ได้
#   - review เมื่อส่งแล้วแก้ไขไม่ได้ (is_immutable=True)
# ──────────────────────────────────────────────────────────────────────────────
@router.post("", response_model=ReviewResponseSchema, status_code=201)
def create_review(
    payload: ReviewCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only the client (employer) may review the freelancer
    if current_user.id != project.client_id:
        raise HTTPException(status_code=403, detail="Only the project client can leave a review")

    # Only after project is completed
    if project.status != ProjectStatus.COMPLETED:
        raise HTTPException(
            status_code=409,
            detail="Reviews are only available after project completion",
        )

    # Reviewee must always be the freelancer
    if payload.reviewee_id != project.freelancer_id:
        raise HTTPException(status_code=400, detail="You can only review the freelancer of this project")

    # Review window: must be within SLA_REVIEW_WINDOW_DAYS after project completion
    if project.completed_at:
        deadline = project.completed_at + timedelta(days=SLA.REVIEW_WINDOW_DAYS)
        if datetime.utcnow() > deadline:
            raise HTTPException(
                status_code=409,
                detail=f"หมดระยะเวลารีวิวแล้ว (รีวิวได้ภายใน {SLA.REVIEW_WINDOW_DAYS} วันหลัง project เสร็จ)",
            )

    # Cannot review the same person twice for the same project
    existing = db.query(Review).filter(
        Review.project_id == payload.project_id,
        Review.reviewer_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Review already submitted")

    review = Review(
        project_id=payload.project_id,
        reviewer_id=current_user.id,
        reviewee_id=payload.reviewee_id,
        rating=payload.rating,
        comment=payload.comment,
        is_immutable=True,
        created_at=datetime.utcnow(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


# ──────────────────────────────────────────────────────────────────────────────
# GET /reviews/projects/{project_id}/mine
#   เช็คว่า current user ได้เขียน review สำหรับโปรเจกต์นี้ไปแล้วหรือยัง
#   - 200 + object  → รีวิวแล้ว → ซ่อนปุ่ม "เขียน Review" ใน UI
#   - 404           → ยังไม่ได้รีวิว → แสดงปุ่ม "เขียน Review" ใน UI
#   ใช้ใน project workspace เพื่อ render ปุ่มให้ถูกต้องก่อน user กด
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/projects/{project_id}/mine", response_model=ReviewStatusSchema)
def get_my_review_for_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """ดึง review ที่ current user เขียนไว้สำหรับ project นี้ (404 = ยังไม่ได้รีวิว)
    Response ยังรวม review_deadline เพื่อให้ frontend แสดง countdown ได้"""
    project = db.query(Project).filter(Project.id == project_id).first()

    review_deadline = None
    if project and project.completed_at:
        review_deadline = project.completed_at + timedelta(days=SLA.REVIEW_WINDOW_DAYS)

    review = (
        db.query(Review)
        .filter(
            Review.project_id == project_id,
            Review.reviewer_id == current_user.id,
        )
        .first()
    )
    if not review:
        raise HTTPException(
            status_code=404,
            detail="Not reviewed yet",
            headers={"X-Review-Deadline": review_deadline.isoformat() if review_deadline else ""},
        )
    return ReviewStatusSchema.from_review(review, review_deadline=review_deadline)


# ──────────────────────────────────────────────────────────────────────────────
# GET /reviews/users/{user_id}
#   ดึง reviews ทั้งหมดที่คนอื่นเขียนให้ user คนนี้ (reviewee = user_id)
#   - ใช้แสดงบนหน้า public profile ของ freelancer / client
#   - เรียงจากใหม่ไปเก่า
#   - join reviewer เพื่อแสดงชื่อ + avatar ของคนที่เขียน
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/users/{user_id}", response_model=list[ReviewResponseSchema])
def get_user_reviews(
    user_id: UUID,
    skip: int = Query(0, ge=0, description="จำนวน record ที่ข้าม"),
    limit: int = Query(20, ge=1, le=100, description="จำนวน record ต่อหน้า"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return (
        db.query(Review)
        .options(joinedload(Review.reviewer))
        .filter(Review.reviewee_id == user_id)
        .order_by(Review.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

