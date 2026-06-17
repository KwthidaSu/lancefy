"""
Projects Service — Rewritten
==============================
ใช้ model ใหม่ทั้งหมด: Project, Milestone, MilestoneSubmission, MilestoneSubmissionFile
ลบ: Job (old), JobOffer, JobAssignment, JobMilestone (DEPRECATED)
"""
import logging
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload, subqueryload

from app.files.models import File
from app.jobs.models import Job, JobSkill, Proposal
from app.payments.models import EscrowHolding, EscrowStatus
from app.payments import service as payment_service
from app.projects.models import (
    Milestone, MilestoneFundingStatus, MilestoneStatus,
    MilestoneSubmission, MilestoneSubmissionFile,
    Project, ProjectStatus,
)
from app.projects.schemas import (
    AcceptOfferSchema,
    MilestoneCreateSchema, MilestoneUpdateSchema, MilestoneResequenceItemSchema,
    MilestonePlanReviewSchema,
    ReviewSubmissionSchema, SubmitMilestoneSchema,
)
from app.notifications.models import Notification

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Projects
# ─────────────────────────────────────────────────────────────────

def _assert_participant(project: Project, user_id: UUID):
    if str(project.client_id) != str(user_id) and str(project.freelancer_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Not a participant of this project")


def get_project(db: Session, project_id: UUID, user_id: UUID) -> Project:
    project = (
        db.query(Project)
        .options(
            joinedload(Project.client),
            joinedload(Project.freelancer),
            joinedload(Project.job).joinedload(Job.category),
            joinedload(Project.job).joinedload(Job.skill_links).joinedload(JobSkill.skill),
        )
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _assert_participant(project, user_id)
    return project


def get_project_offers(db: Session, project_id: UUID, user_id: UUID) -> list[dict]:
    project = (
        db.query(Project)
        .options(joinedload(Project.proposal))
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _assert_participant(project, user_id)

    proposals_query = (
        db.query(Proposal)
        .options(joinedload(Proposal.freelancer))
        .order_by(Proposal.created_at.desc())
    )

    if project.job_id:
        proposals_query = proposals_query.filter(Proposal.job_id == project.job_id)
        if str(project.client_id) != str(user_id):
            proposals_query = proposals_query.filter(Proposal.freelancer_id == user_id)
    elif project.proposal_id:
        proposals_query = proposals_query.filter(Proposal.id == project.proposal_id)
    else:
        return []

    proposals = proposals_query.all()
    accepted_offer_milestones = []
    if project.proposal_id:
        accepted_offer_milestones = (
            db.query(Milestone)
            .filter(Milestone.project_id == project.id)
            .order_by(Milestone.sequence, Milestone.created_at)
            .all()
        )

    offer_rows: list[dict] = []
    for proposal in proposals:
        freelancer = proposal.freelancer
        proposed_milestones = []
        if project.proposal_id and str(project.proposal_id) == str(proposal.id):
            proposed_milestones = [
                {
                    "id": milestone.id,
                    "offer_id": proposal.id,
                    "title": milestone.title,
                    "description": milestone.description,
                    "amount": milestone.amount or Decimal("0.00"),
                    "estimated_days": None,
                    "deliverables": [],
                    "status": milestone.status,
                    "created_at": milestone.created_at,
                }
                for milestone in accepted_offer_milestones
            ]

        offer_rows.append({
            "id": proposal.id,
            "job_id": proposal.job_id or project.job_id or project.id,
            "client_id": proposal.client_id,
            "freelancer_id": proposal.freelancer_id,
            "freelancer_firstname": freelancer.firstname if freelancer else None,
            "freelancer_lastname": freelancer.lastname if freelancer else None,
            "freelancer_username": freelancer.username if freelancer else None,
            "proposed_budget": proposal.proposed_budget or project.total_budget or Decimal("0.00"),
            "currency": "THB",
            "message": proposal.message,
            "attachments": [],
            "offer_type": "proposal",
            "status": proposal.status,
            "created_at": proposal.created_at,
            "proposed_milestones": proposed_milestones,
        })

    return offer_rows


def list_projects(
    db: Session,
    user_id: UUID,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    role: Optional[str] = None,
) -> dict:
    q = (
        db.query(Project)
        .options(
            joinedload(Project.client),
            joinedload(Project.freelancer),
            subqueryload(Project.milestones),
        )
    )
    if role == "owner":
        q = q.filter(Project.client_id == user_id)
    elif role == "freelancer":
        q = q.filter(Project.freelancer_id == user_id)
    else:
        q = q.filter(
            (Project.client_id == user_id) | (Project.freelancer_id == user_id)
        )
    if status:
        status_values = [item.strip() for item in status.split(",") if item.strip()]
        if len(status_values) == 1:
            q = q.filter(Project.status == status_values[0])
        elif status_values:
            q = q.filter(Project.status.in_(status_values))
    if search:
        q = q.filter(Project.title.ilike(f"%{search}%"))

    total = q.count()
    data = q.order_by(Project.started_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"data": data, "total": total, "page": page, "page_size": page_size}


def complete_project(db: Session, project_id: UUID, user_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_client = str(project.client_id) == str(user_id)
    is_freelancer = str(project.freelancer_id) == str(user_id)
    if not is_client and not is_freelancer:
        raise HTTPException(status_code=403, detail="Not a participant of this project")

    if project.status not in (ProjectStatus.ACTIVE, ProjectStatus.COMPLETED):
        raise HTTPException(status_code=400, detail="Project is not active")

    now = datetime.utcnow()
    if is_client and not project.client_completion_confirmed_at:
        project.client_completion_confirmed_at = now
    if is_freelancer and not project.freelancer_completion_confirmed_at:
        project.freelancer_completion_confirmed_at = now

    # FIX-2: client confirming is sufficient to complete the project immediately
    if project.client_completion_confirmed_at:
        project.status = ProjectStatus.COMPLETED
        if not project.completed_at:
            project.completed_at = now
        # Archive the project chat room
        try:
            from app.chat.models import ChatRoom, ChatRoomStatus
            project_room = (
                db.query(ChatRoom)
                .filter(
                    ChatRoom.project_id == project.id,
                    ChatRoom.room_type == "project",
                )
                .first()
            )
            if project_room:
                project_room.status = ChatRoomStatus.ARCHIVED
        except (ImportError, SQLAlchemyError):
            logger.exception("Failed to archive project chat room | project_id=%s", project.id)

        db.add(Notification(
            user_id=project.client_id,
            actor_id=project.freelancer_id,
            type="project_completed",
            title="โปรเจกต์เสร็จสมบูรณ์",
            body=f"โปรเจกต์ '{project.title}' เสร็จสิ้นแล้ว",
            reference_type="project",
            reference_id=str(project.id),
            is_read=False,
            created_at=now,
        ))
        db.add(Notification(
            user_id=project.freelancer_id,
            actor_id=project.client_id,
            type="project_completed",
            title="โปรเจกต์เสร็จสมบูรณ์",
            body=f"โปรเจกต์ '{project.title}' เสร็จสิ้นแล้ว",
            reference_type="project",
            reference_id=str(project.id),
            is_read=False,
            created_at=now,
        ))

    db.commit()
    db.refresh(project)
    return project


def cancel_project(db: Session, project_id: UUID, user_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # FIX-1: only client can cancel
    if str(project.client_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Only the client can cancel a project")
    if project.status != ProjectStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Only active projects can be cancelled")

    now = datetime.utcnow()

    # FIX-1: handle escrow per milestone
    # — PAID milestones: freelancer already received money, leave as-is
    # — FUNDED (HELD) milestones: refund back to client
    # — UNFUNDED milestones: nothing to do
    milestones = db.query(Milestone).filter(Milestone.project_id == project_id).all()
    for m in milestones:
        if m.funding_status == MilestoneFundingStatus.FUNDED:
            try:
                payment_service.refund_escrow(db, milestone_id=m.id, released_by=user_id)
            except HTTPException:
                logger.warning(
                    "Skipping funded milestone refund during project cancellation | milestone_id=%s project_id=%s",
                    m.id,
                    project_id,
                )

    project.status = ProjectStatus.CANCELLED
    project.completed_at = now

    db.add(Notification(
        user_id=project.freelancer_id,
        actor_id=project.client_id,
        type="project_completed",
        title="โปรเจกต์ถูกยกเลิก",
        body=f"โปรเจกต์ '{project.title}' ถูกยกเลิกโดย client",
        reference_type="project",
        reference_id=str(project.id),
        is_read=False,
        created_at=now,
    ))

    db.commit()
    db.refresh(project)
    return project


# ─────────────────────────────────────────────────────────────────
# Milestones
# ─────────────────────────────────────────────────────────────────

def list_milestones(db: Session, project_id: UUID, user_id: UUID) -> list[Milestone]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _assert_participant(project, user_id)
    return (
        db.query(Milestone)
        .filter(Milestone.project_id == project_id)
        .order_by(Milestone.sequence)
        .all()
    )


def get_project_payout_summary(db: Session, project_id: UUID, user_id: UUID) -> dict:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _assert_participant(project, user_id)

    milestones = (
        db.query(Milestone)
        .filter(Milestone.project_id == project_id)
        .order_by(Milestone.sequence, Milestone.created_at)
        .all()
    )
    milestone_ids = [milestone.id for milestone in milestones]

    escrows = []
    if milestone_ids:
        escrows = (
            db.query(EscrowHolding)
            .filter(EscrowHolding.milestone_id.in_(milestone_ids))
            .all()
        )

    escrow_by_milestone = {escrow.milestone_id: escrow for escrow in escrows}
    currency = next(
        (escrow.currency for escrow in escrows if escrow.currency),
        "THB",
    )

    total_milestone_amount = Decimal("0.00")
    total_funded_amount = Decimal("0.00")
    total_released_amount = Decimal("0.00")
    milestone_summaries: list[dict] = []

    for milestone in milestones:
        milestone_amount = Decimal(milestone.amount or 0)
        total_milestone_amount += milestone_amount

        escrow = escrow_by_milestone.get(milestone.id)
        released_amount = Decimal("0.00")

        if escrow:
            if escrow.status == EscrowStatus.HELD.value:
                total_funded_amount += Decimal(escrow.amount or 0)
            elif escrow.status == EscrowStatus.RELEASED.value:
                released_amount = Decimal(escrow.net_payout_amount or escrow.amount or 0)
                total_released_amount += released_amount

        milestone_summaries.append({
            "milestone_id": milestone.id,
            "title": milestone.title,
            "amount": milestone.amount,
            "currency": escrow.currency if escrow and escrow.currency else currency,
            "funding_status": str(milestone.funding_status) if milestone.funding_status is not None else None,
            "released_amount": released_amount,
        })

    total_available_amount = total_milestone_amount - total_funded_amount - total_released_amount
    if total_available_amount < Decimal("0.00"):
        total_available_amount = Decimal("0.00")

    return {
        "project_id": project.id,
        "currency": currency,
        "total_milestone_amount": total_milestone_amount,
        "total_funded_amount": total_funded_amount,
        "total_released_amount": total_released_amount,
        "total_available_amount": total_available_amount,
        "milestones": milestone_summaries,
    }


def create_milestone(
    db: Session, project_id: UUID, user_id: UUID, payload: MilestoneCreateSchema
) -> Milestone:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if str(project.client_id) != str(user_id) and str(project.freelancer_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Not a participant")
    if project.status != ProjectStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Project is not active")

    ms = Milestone(
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        amount=payload.amount,
        sequence=payload.sequence,
        due_date=payload.due_date,
        status=MilestoneStatus.PENDING,
        funding_status=MilestoneFundingStatus.UNFUNDED,
    )
    db.add(ms)
    db.commit()
    db.refresh(ms)
    return ms


def update_milestone(
    db: Session, project_id: UUID, milestone_id: UUID, user_id: UUID, payload: MilestoneUpdateSchema
) -> Milestone:
    milestone = (
        db.query(Milestone)
        .filter(Milestone.id == milestone_id, Milestone.project_id == project_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    project = milestone.project
    _assert_participant(project, user_id)

    if milestone.status not in (MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS):
        raise HTTPException(status_code=400, detail="Cannot edit submitted or completed milestone")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(milestone, field, val)

    db.commit()
    db.refresh(milestone)
    return milestone


def delete_milestone(
    db: Session, project_id: UUID, milestone_id: UUID, user_id: UUID
) -> None:
    milestone = (
        db.query(Milestone)
        .filter(Milestone.id == milestone_id, Milestone.project_id == project_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    project = milestone.project
    _assert_participant(project, user_id)
    if str(project.client_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Only project owner can delete milestones")
    locked_statuses = (MilestoneStatus.SUBMITTED, MilestoneStatus.APPROVED, MilestoneStatus.PAID, MilestoneStatus.REVISION_REQUESTED)
    locked_funding = (MilestoneFundingStatus.FUNDED, MilestoneFundingStatus.RELEASED)
    if milestone.status in locked_statuses or milestone.funding_status in locked_funding:
        raise HTTPException(status_code=400, detail="Cannot delete a submitted, approved, or funded milestone")
    db.delete(milestone)
    db.commit()


def resequence_milestones(
    db: Session, project_id: UUID, user_id: UUID, items: list[MilestoneResequenceItemSchema]
) -> None:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _assert_participant(project, user_id)
    ids = [str(item.id) for item in items]
    existing = db.query(Milestone).filter(
        Milestone.project_id == project_id
    ).all()
    existing_by_id = {str(m.id): m for m in existing}
    for item in items:
        if str(item.id) not in existing_by_id:
            raise HTTPException(status_code=400, detail=f"Milestone {item.id} not found in this project")
        existing_by_id[str(item.id)].sequence = item.sequence
    db.commit()


def propose_milestone_plan(
    db: Session, project_id: UUID, user_id: UUID
) -> Project:
    project = (
        db.query(Project)
        .options(
            joinedload(Project.client),
            joinedload(Project.freelancer),
        )
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _assert_participant(project, user_id)
    project.milestone_plan_pending = True
    project.milestone_plan_proposed_by = user_id
    db.commit()
    db.refresh(project)
    return project


def review_milestone_plan(
    db: Session, project_id: UUID, user_id: UUID, payload: MilestonePlanReviewSchema
) -> dict:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _assert_participant(project, user_id)
    if not project.milestone_plan_pending:
        raise HTTPException(status_code=400, detail="No pending milestone plan to review")
    if project.milestone_plan_proposed_by and str(project.milestone_plan_proposed_by) == str(user_id):
        raise HTTPException(status_code=403, detail="Cannot review your own milestone plan proposal")
    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")
    project.milestone_plan_pending = False
    project.milestone_plan_proposed_by = None
    db.commit()
    return {"ok": True, "action": payload.action}


def accept_offer(
    db: Session,
    project_id: UUID,
    offer_id: UUID,  # kept for compatibility with chat route signature
    client_id: UUID,
    payload: AcceptOfferSchema,
) -> Project:
    _ = offer_id
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if str(project.client_id) != str(client_id):
        raise HTTPException(status_code=403, detail="Only project client can accept offer")
    if not payload.proposed_milestones:
        raise HTTPException(status_code=400, detail="proposed_milestones is required")

    target_freelancer_id = project.freelancer_id
    if payload.freelancer_id:
        try:
            target_freelancer_id = UUID(str(payload.freelancer_id))
        except (TypeError, ValueError):
            target_freelancer_id = project.freelancer_id
    if not target_freelancer_id:
        raise HTTPException(status_code=400, detail="freelancer_id is required")
    if str(target_freelancer_id) == str(project.client_id):
        raise HTTPException(status_code=400, detail="freelancer_id cannot be project client")

    proposed_budget = Decimal(payload.proposed_budget)
    if proposed_budget <= 0:
        raise HTTPException(status_code=400, detail="Invalid proposed_budget")

    milestone_sum = sum(Decimal(m.amount) for m in payload.proposed_milestones)
    if abs(milestone_sum - proposed_budget) > Decimal("0.01"):
        raise HTTPException(status_code=400, detail="proposed_budget must equal sum of proposed_milestones.amount")

    existing = db.query(Milestone).filter(Milestone.project_id == project_id).all()
    locked = [
        m for m in existing
        if m.status in (
            MilestoneStatus.SUBMITTED,
            MilestoneStatus.APPROVED,
            MilestoneStatus.PAID,
        ) or m.funding_status in (
            MilestoneFundingStatus.FUNDED,
            MilestoneFundingStatus.RELEASED,
        )
    ]
    if locked:
        raise HTTPException(status_code=400, detail="Cannot replace milestones after work/funding started")

    project.freelancer_id = target_freelancer_id
    project.total_budget = proposed_budget
    project.status = ProjectStatus.ACTIVE

    for m in existing:
        db.delete(m)
    db.flush()

    started_at = project.started_at or datetime.utcnow()
    start_date = started_at.date()
    for idx, item in enumerate(payload.proposed_milestones, start=1):
        due_date = None
        if item.estimated_days and item.estimated_days > 0:
            due_date = start_date + timedelta(days=item.estimated_days)
        db.add(
            Milestone(
                project_id=project_id,
                title=item.title,
                description=item.description,
                amount=item.amount,
                sequence=idx,
                due_date=due_date,
                status=MilestoneStatus.PENDING,
                funding_status=MilestoneFundingStatus.UNFUNDED,
            )
        )

    db.add(Notification(
        user_id=target_freelancer_id,
        actor_id=client_id,
        type="project_created",
        title="งานใหม่เริ่มแล้ว",
        body=f"โปรเจกต์ '{project.title}' เริ่มต้นแล้ว ยินดีต้อนรับ!",
        reference_type="project",
        reference_id=str(project.id),
        is_read=False,
        created_at=datetime.utcnow(),
    ))

    # Keep the source job in an active/in-progress state once a project starts.
    # The jobs table constraint in this branch does not allow "closed".
    if project.job_id:
        from app.jobs.models import Job, JobStatus as JbStatus
        job_row = db.query(Job).filter(Job.id == project.job_id).first()
        if job_row and job_row.status == JbStatus.OPEN:
            job_row.status = JbStatus.ACTIVE

    db.commit()
    db.refresh(project)
    return project


# ─────────────────────────────────────────────────────────────────
# Submissions
# ─────────────────────────────────────────────────────────────────

def list_submissions(db: Session, project_id: UUID, milestone_id: UUID, user_id: UUID) -> list[MilestoneSubmission]:
    milestone = (
        db.query(Milestone)
        .filter(Milestone.id == milestone_id, Milestone.project_id == project_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    _assert_participant(milestone.project, user_id)
    submissions = (
        db.query(MilestoneSubmission)
        .options(joinedload(MilestoneSubmission.files))
        .filter(MilestoneSubmission.milestone_id == milestone_id)
        .order_by(MilestoneSubmission.revision_number)
        .all()
    )

    file_ids: list[UUID] = []
    for submission in submissions:
        for submission_file in submission.files:
            if submission_file.file_id:
                file_ids.append(submission_file.file_id)

    file_map: dict[UUID, File] = {}
    if file_ids:
        files = db.query(File).filter(File.id.in_(file_ids)).all()
        file_map = {file_rec.id: file_rec for file_rec in files}

    for submission in submissions:
        for submission_file in submission.files:
            file_rec = file_map.get(submission_file.file_id)
            # Keep response compatible without adding ORM relationships.
            submission_file.file_url = f"/api/files/{submission_file.file_id}/content"
            submission_file.original_name = file_rec.original_name if file_rec else None

    return submissions


def submit_milestone(
    db: Session, project_id: UUID, milestone_id: UUID, freelancer_id: UUID, payload: SubmitMilestoneSchema
) -> MilestoneSubmission:
    milestone = (
        db.query(Milestone)
        .filter(Milestone.id == milestone_id, Milestone.project_id == project_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    project = milestone.project
    if str(project.freelancer_id) != str(freelancer_id):
        raise HTTPException(status_code=403, detail="Only the freelancer can submit work")
    if milestone.status in (MilestoneStatus.APPROVED, MilestoneStatus.PAID):
        raise HTTPException(status_code=400, detail="Milestone already approved")

    # หา revision_number ล่าสุด
    last = (
        db.query(func.max(MilestoneSubmission.revision_number))
        .filter(MilestoneSubmission.milestone_id == milestone_id)
        .scalar()
    ) or 0

    submission = MilestoneSubmission(
        milestone_id=milestone_id,
        submitted_by=freelancer_id,
        revision_number=last + 1,
        message=payload.message,
        status="pending",
        submitted_at=datetime.utcnow(),
    )
    db.add(submission)
    db.flush()

    # Link files
    for i, file_id in enumerate(payload.file_ids or []):
        file_rec = db.query(File).filter(File.id == file_id, File.owner_id == freelancer_id).first()
        if not file_rec:
            raise HTTPException(status_code=404, detail=f"File {file_id} not found or not yours")
        db.add(MilestoneSubmissionFile(
            submission_id=submission.id,
            file_id=file_id,
            sort_order=i,
        ))

    milestone.status = MilestoneStatus.SUBMITTED

    db.add(Notification(
        user_id=project.client_id,
        actor_id=freelancer_id,
        type="work_submitted",
        title="Freelancer ส่งงานแล้ว",
        body=f"Milestone '{milestone.title}' ถูกส่งเพื่อรอการตรวจสอบ",
        reference_type="project",
        reference_id=str(project.id),
        is_read=False,
        created_at=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(submission)
    return submission


def review_submission(
    db: Session,
    project_id: UUID,
    milestone_id: UUID,
    submission_id: UUID,
    client_id: UUID,
    payload: ReviewSubmissionSchema,
) -> MilestoneSubmission:
    milestone = (
        db.query(Milestone)
        .filter(Milestone.id == milestone_id, Milestone.project_id == project_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    project = milestone.project
    if str(project.client_id) != str(client_id):
        raise HTTPException(status_code=403, detail="Only client can review submissions")

    submission = db.query(MilestoneSubmission).filter(
        MilestoneSubmission.id == submission_id,
        MilestoneSubmission.milestone_id == milestone_id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.status not in ("pending", "submitted"):
        raise HTTPException(status_code=400, detail="Submission already reviewed")

    if payload.action == "approve":
        submission.status = "approved"
        milestone.status = MilestoneStatus.APPROVED
        submission.reviewed_at = datetime.utcnow()
        # Release payment ถ้า milestone funded แล้ว
        if milestone.funding_status == MilestoneFundingStatus.FUNDED:
            try:
                payment_service.release_escrow(db, milestone_id=milestone_id)
                milestone.status = MilestoneStatus.PAID
            except HTTPException:
                logger.warning(
                    "Milestone approved but escrow release was skipped | milestone_id=%s project_id=%s",
                    milestone_id,
                    project_id,
                )
        db.add(Notification(
            user_id=project.freelancer_id,
            actor_id=client_id,
            type="work_approved",
            title="งานได้รับการอนุมัติ",
            body=f"Milestone '{milestone.title}' ได้รับการอนุมัติแล้ว",
            reference_type="project",
            reference_id=str(project.id),
            is_read=False,
            created_at=datetime.utcnow(),
        ))
    elif payload.action == "reject":
        feedback = (payload.feedback or "").strip()
        if not feedback:
            raise HTTPException(status_code=400, detail="feedback is required for revision request")

        # Persist revision note on this submission so freelancer can see exactly what to fix.
        if submission.message:
            submission.message = f"{submission.message}\n\n[REVISION_REQUEST]\n{feedback}"
        else:
            submission.message = f"[REVISION_REQUEST]\n{feedback}"

        submission.status = "revision_requested"
        milestone.status = MilestoneStatus.REVISION_REQUESTED
        submission.reviewed_at = datetime.utcnow()
        db.add(Notification(
            user_id=project.freelancer_id,
            actor_id=client_id,
            type="work_rejected",
            title="งานถูกขอให้แก้ไข",
            body=f"Milestone '{milestone.title}' ถูกขอให้แก้ไข: {feedback[:100]}",
            reference_type="project",
            reference_id=str(project.id),
            is_read=False,
            created_at=datetime.utcnow(),
        ))
    else:
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    db.commit()
    db.refresh(submission)
    return submission


def release_milestone_payment(
    db: Session,
    project_id: UUID,
    milestone_id: UUID,
    user_id: UUID,
) -> dict:
    milestone = (
        db.query(Milestone)
        .filter(Milestone.id == milestone_id, Milestone.project_id == project_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    project = milestone.project
    if str(project.client_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Only client can release payment")
    if milestone.funding_status != MilestoneFundingStatus.FUNDED:
        raise HTTPException(
            status_code=400,
            detail="This milestone has not been funded in escrow yet.",
        )

    payment_service.release_escrow(db, milestone_id=milestone_id, released_by=user_id)

    milestone.funding_status = MilestoneFundingStatus.RELEASED
    if milestone.status == MilestoneStatus.APPROVED:
        milestone.status = MilestoneStatus.PAID

    db.add(Notification(
        user_id=project.freelancer_id,
        actor_id=user_id,
        type="payment_released",
        title="การชำระเงินถูกปล่อยแล้ว",
        body=f"ค่างาน Milestone '{milestone.title}' ถูกโอนให้คุณแล้ว",
        reference_type="project",
        reference_id=str(project.id),
        is_read=False,
        created_at=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(milestone)

    return {
        "message": "Payment released",
        "milestone_id": milestone.id,
        "released_at": datetime.utcnow(),
        "amount": milestone.amount,
    }
# ─────────────────────────────────────────────────────────────────
# Calendar
# ─────────────────────────────────────────────────────────────────

def get_calendar_events(
    db: Session,
    user_id: UUID,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> list[dict]:
    """
    ดึง calendar events ทั้งหมดของ user:
      - milestone.due_date  (pending/in_progress/submitted/rejected)
      - project.deadline_date (active/disputed)
      - job.expires_at  (เฉพาะ job ที่ user เป็น owner, status=open)

    ถ้าส่ง month+year มา จะ filter เฉพาะช่วงนั้น
    ถ้าไม่ส่ง จะคืนทั้งหมด
    """
    from app.jobs.models import Job, JobStatus

    today = date.today()
    events: list[dict] = []

    # ── filter range ──────────────────────────────────────────────
    if month and year:
        from calendar import monthrange
        range_start = date(year, month, 1)
        range_end = date(year, month, monthrange(year, month)[1])
    else:
        range_start = None
        range_end = None

    def _in_range(d: date) -> bool:
        if range_start is None:
            return True
        return range_start <= d <= range_end

    # ── 1. Milestone due_date ──────────────────────────────────────
    ACTIVE_MS_STATUSES = {
        MilestoneStatus.PENDING,
        MilestoneStatus.IN_PROGRESS,
        MilestoneStatus.SUBMITTED,
        MilestoneStatus.REJECTED,
    }
    milestones = (
        db.query(Milestone, Project)
        .join(Project, Project.id == Milestone.project_id)
        .filter(
            Milestone.due_date.isnot(None),
            Milestone.status.in_([s.value for s in ACTIVE_MS_STATUSES]),
            (Project.client_id == user_id) | (Project.freelancer_id == user_id),
            Project.status.in_(["active", "disputed"]),
        )
        .all()
    )
    for ms, proj in milestones:
        d = ms.due_date
        if isinstance(d, datetime):
            d = d.date()
        if _in_range(d):
            events.append({
                "event_type": "milestone",
                "event_date": d,
                "title": ms.title,
                "project_title": proj.title,
                "project_id": ms.project_id,
                "milestone_id": ms.id,
                "job_id": None,
                "status": ms.status,
                "is_overdue": d < today,
            })

    # ── 2. Project deadline_date ───────────────────────────────────
    projects = (
        db.query(Project)
        .filter(
            Project.deadline_date.isnot(None),
            Project.status.in_(["active", "disputed"]),
            (Project.client_id == user_id) | (Project.freelancer_id == user_id),
        )
        .all()
    )
    for proj in projects:
        d = proj.deadline_date
        if isinstance(d, datetime):
            d = d.date()
        if _in_range(d):
            events.append({
                "event_type": "project_deadline",
                "event_date": d,
                "title": proj.title,
                "project_id": proj.id,
                "milestone_id": None,
                "job_id": None,
                "status": proj.status,
                "is_overdue": d < today,
            })

    # ── 3. Job expires_at (owner only) ────────────────────────────
    jobs = (
        db.query(Job)
        .filter(
            Job.expires_at.isnot(None),
            Job.owner_id == user_id,
            Job.status == JobStatus.OPEN,
        )
        .all()
    )
    for job in jobs:
        d = job.expires_at
        if isinstance(d, datetime):
            d = d.date()
        if _in_range(d):
            events.append({
                "event_type": "job_expires",
                "event_date": d,
                "title": job.title,
                "project_id": None,
                "milestone_id": None,
                "job_id": job.id,
                "status": job.status,
                "is_overdue": d < today,
            })

    # เรียงตาม event_date
    events.sort(key=lambda e: e["event_date"])
    return events


# ─────────────────────────────────────────────────────────────────
# Payout Summary
# ─────────────────────────────────────────────────────────────────

def get_project_payout_summary(db: Session, project_id: UUID, user_id: UUID) -> dict:
    """สรุปยอด escrow / payout ของทุก milestone ใน project"""
    from app.payments.models import EscrowHolding

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if str(user_id) not in (str(project.client_id), str(project.freelancer_id)):
        raise HTTPException(status_code=403, detail="Not a participant of this project")

    milestones = (
        db.query(Milestone)
        .filter(Milestone.project_id == project_id)
        .order_by(Milestone.sequence.asc())
        .all()
    )

    ms_ids = [m.id for m in milestones]
    escrows = (
        db.query(EscrowHolding)
        .filter(EscrowHolding.milestone_id.in_(ms_ids))
        .all()
    ) if ms_ids else []
    escrow_map = {e.milestone_id: e for e in escrows}

    total_milestone_amount = Decimal("0")
    total_funded = Decimal("0")
    total_released = Decimal("0")
    currency = None
    ms_summaries = []

    for m in milestones:
        amount = m.amount or Decimal("0")
        total_milestone_amount += amount
        e = escrow_map.get(m.id)
        funded = e.amount if e else Decimal("0")
        released = e.net_payout_amount if e and e.status == "RELEASED" else Decimal("0")
        total_funded += funded
        total_released += released
        if not currency and e:
            currency = e.currency

        ms_summaries.append({
            "milestone_id": m.id,
            "title": m.title,
            "amount": amount,
            "currency": e.currency if e else "THB",
            "funding_status": m.funding_status,
            "released_amount": released,
        })

    return {
        "project_id": project_id,
        "currency": currency or "THB",
        "total_milestone_amount": total_milestone_amount,
        "total_funded_amount": total_funded,
        "total_released_amount": total_released,
        "total_available_amount": total_funded - total_released,
        "milestones": ms_summaries,
    }
