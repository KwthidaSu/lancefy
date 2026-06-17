from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, exists, func, or_
from sqlalchemy.orm import Session, joinedload

from app.chat.models import ChatRoom, ChatParticipant
from app.jobs.models import Job, JobSkill, JobStatus, JobType, Proposal, ProposalStatus
from app.projects.models import Project
from app.notifications.models import Notification
from app.skills.models import Skill
from app.users.models import User, UserFreelanceSkill

PRE_CONTRACT_PROJECT_STATUSES = {"draft", "open", "expired"}


# ─────────────────────────────────────────────────────────────────
# Jobs
# ─────────────────────────────────────────────────────────────────

def create_job(
    db: Session,
    owner_id: UUID,
    job_type: JobType,
    title: str,
    description: Optional[str],
    budget: Optional[float],
    category_id: Optional[UUID],
    subcategory_id: Optional[UUID],
    skill_ids: list[UUID],
    tags: list[str],
    images: list[str],
    expires_at: Optional[datetime],
    delivery_date,
) -> Job:
    # FIX-7: auto-set expiry if caller did not provide one
    if expires_at is None:
        from app.core.config import settings
        expires_at = datetime.utcnow() + timedelta(days=settings.SLA_JOB_DEFAULT_EXPIRY_DAYS)

    # Guard: SERVICE job = freelancer โพสขายบริการตัวเอง — ต้องมี freelance profile ก่อน
    # HIRE job = ใครก็โพสได้ (เป็น client ต้องการจ้าง)
    if job_type == JobType.SERVICE:
        freelance_profile = (
            db.query(UserFreelanceSkill)
            .filter(UserFreelanceSkill.user_id == owner_id)
            .first()
        )
        if not freelance_profile:
            raise HTTPException(
                status_code=403,
                detail="ต้องตั้งค่า Freelance Profile ก่อนจึงจะโพสต์งานประเภทรับทำได้"
            )
        # SERVICE freelancer ต้อง KYC verified ก่อนโพสเช่นเดียวกับ proposal HIRE
        owner = db.query(User).filter(User.id == owner_id).first()
        if not owner or owner.kyc_status != "verified":
            raise HTTPException(
                status_code=403,
                detail="ต้องยืนยันตัวตน (KYC) ก่อนจึงจะโพสต์งานประเภทรับทำได้"
            )

    job = Job(
        owner_id=owner_id,
        job_type=job_type,
        title=title,
        description=description,
        budget=budget,
        category_id=category_id,
        subcategory_id=subcategory_id,
        images=images or [],
        tags=tags or [],
        expires_at=expires_at,
        delivery_date=delivery_date,
        status=JobStatus.OPEN,
    )
    db.add(job)
    db.flush()

    # Create a pre-contract project row immediately on job creation.
    # It becomes the real contract project later when a proposal is accepted.
    db.add(
        Project(
            job_id=job.id,
            proposal_id=None,
            client_id=owner_id,
            freelancer_id=None,
            title=title,
            description=description,
            total_budget=budget,
            status="open",
            deadline_date=delivery_date,
        )
    )

    _set_job_skills(db, job.id, skill_ids)

    db.commit()
    db.refresh(job)
    return job


def _set_job_skills(db: Session, job_id: UUID, skill_ids: list[UUID]) -> None:
    db.query(JobSkill).filter(JobSkill.job_id == job_id).delete()
    for sid in skill_ids:
        db.add(JobSkill(job_id=job_id, skill_id=sid))


def get_job(db: Session, job_id: UUID) -> Optional[Job]:
    job = (
        db.query(Job)
        .options(
            joinedload(Job.owner),
            joinedload(Job.skill_links).joinedload(JobSkill.skill),
        )
        .filter(Job.id == job_id)
        .first()
    )
    # Auto-expire: if expires_at is set and has passed, mark as expired
    if (
        job is not None
        and job.status == JobStatus.OPEN
        and job.expires_at is not None
        and job.expires_at < datetime.utcnow()
    ):
        job.status = JobStatus.CANCELLED
        db.commit()
        db.refresh(job)
    return job


def list_jobs(
    db: Session,
    job_type: Optional[str] = None,
    category_id: Optional[UUID] = None,
    category_slug: Optional[str] = None,
    subcategory_slug: Optional[str] = None,
    status: Optional[str] = JobStatus.OPEN,
    owner_id: Optional[UUID] = None,
    exclude_owner_id: Optional[UUID] = None,
    search: Optional[str] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    sort: Optional[str] = "published_desc",
    exclude_taken: bool = False,
    skip: int = 0,
    limit: int = 20,
) -> list[Job]:
    from app.skills.models import Category, Subcategory
    # subquery สำหรับ proposals_count แต่ละ job
    proposal_count_sq = (
        db.query(func.count(Proposal.id))
        .filter(Proposal.job_id == Job.id)
        .correlate(Job)
        .scalar_subquery()
        .label("proposals_count")
    )
    q = db.query(Job, proposal_count_sq).options(
        joinedload(Job.owner),
        joinedload(Job.skill_links).joinedload(JobSkill.skill),
        joinedload(Job.category),
        joinedload(Job.subcategory),
    )
    if job_type:
        q = q.filter(Job.job_type == job_type)
    # Apply category filter first
    if category_slug:
        cat_id = db.query(Category.id).filter(Category.slug == category_slug).scalar()
        if not cat_id:
            return []
        q = q.filter(Job.category_id == cat_id)
    elif category_id:
        q = q.filter(Job.category_id == category_id)
    # Apply subcategory filter on top (if any)
    if subcategory_slug:
        slugs = [s.strip() for s in subcategory_slug.split(",") if s.strip()]
        include_none = "__none__" in slugs
        real_slugs = [s for s in slugs if s != "__none__"]
        conditions = []
        if real_slugs:
            sub_ids = [r[0] for r in db.query(Subcategory.id).filter(Subcategory.slug.in_(real_slugs)).all()]
            if sub_ids:
                conditions.append(Job.subcategory_id.in_(sub_ids))
        if include_none:
            conditions.append(Job.subcategory_id == None)
        if not conditions:
            return []
        q = q.filter(or_(*conditions))
    if status:
        q = q.filter(Job.status == status)
    else:
        # ไม่แสดง soft-deleted jobs ในทุกกรณีที่ไม่ได้ filter status โดยตรง
        q = q.filter(Job.status != JobStatus.CANCELLED)
    if owner_id:
        q = q.filter(Job.owner_id == owner_id)
    if exclude_owner_id:
        q = q.filter(Job.owner_id != exclude_owner_id)
    if search:
        q = q.filter(Job.title.ilike(f"%{search}%"))
    if budget_min is not None:
        q = q.filter(Job.budget >= budget_min)
    if budget_max is not None:
        q = q.filter(Job.budget <= budget_max)
    if exclude_taken:
        q = q.order_by(Job.budget.desc().nullslast())
    elif sort == "budget_asc":
        q = q.order_by(Job.budget.asc().nullsfirst())
    elif sort == "deadline_asc":
        q = q.order_by(Job.delivery_date.asc().nullslast())
    elif sort == "published_asc":
        q = q.order_by(Job.created_at.asc())
    else:
        q = q.order_by(Job.created_at.desc())

    rows = q.offset(skip).limit(limit).all()
    # unpack (Job, proposals_count) tuples
    for job, cnt in rows:
        job.proposals_count = cnt
    return [job for job, _ in rows]


def count_jobs(
    db: Session,
    job_type: Optional[str] = None,
    category_id: Optional[UUID] = None,
    category_slug: Optional[str] = None,
    subcategory_slug: Optional[str] = None,
    status: Optional[str] = JobStatus.OPEN,
    owner_id: Optional[UUID] = None,
    exclude_owner_id: Optional[UUID] = None,
    search: Optional[str] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    exclude_taken: bool = False,
) -> int:
    q = db.query(func.count(Job.id))
    if job_type:
        q = q.filter(Job.job_type == job_type)
    # Apply category filter first
    if category_slug:
        from app.skills.models import Category
        cat_id = db.query(Category.id).filter(Category.slug == category_slug).scalar()
        if not cat_id:
            return 0
        q = q.filter(Job.category_id == cat_id)
    elif category_id:
        q = q.filter(Job.category_id == category_id)
    # Apply subcategory filter on top (if any)
    if subcategory_slug:
        from app.skills.models import Subcategory
        slugs = [s.strip() for s in subcategory_slug.split(",") if s.strip()]
        include_none = "__none__" in slugs
        real_slugs = [s for s in slugs if s != "__none__"]
        conditions = []
        if real_slugs:
            sub_ids = [r[0] for r in db.query(Subcategory.id).filter(Subcategory.slug.in_(real_slugs)).all()]
            if sub_ids:
                conditions.append(Job.subcategory_id.in_(sub_ids))
        if include_none:
            conditions.append(Job.subcategory_id == None)
        if not conditions:
            return 0
        q = q.filter(or_(*conditions))
    if status:
        q = q.filter(Job.status == status)
    else:
        q = q.filter(Job.status != JobStatus.CANCELLED)
    if owner_id:
        q = q.filter(Job.owner_id == owner_id)
    if exclude_owner_id:
        q = q.filter(Job.owner_id != exclude_owner_id)
    if search:
        q = q.filter(Job.title.ilike(f"%{search}%"))
    if budget_min is not None:
        q = q.filter(Job.budget >= budget_min)
    if budget_max is not None:
        q = q.filter(Job.budget <= budget_max)
    if exclude_taken:
        accepted_proposal_exists = exists().where(
            and_(
                Proposal.job_id == Job.id,
                Proposal.status == ProposalStatus.ACCEPTED,
            )
        )
        contracted_project_exists = exists().where(
            and_(
                Project.job_id == Job.id,
                ~Project.status.in_(tuple(PRE_CONTRACT_PROJECT_STATUSES)),
            )
        )
        q = q.filter(~accepted_proposal_exists, ~contracted_project_exists)
    return q.scalar() or 0


def update_job(db: Session, job_id: UUID, owner_id: UUID, data: dict) -> Job:
    job = db.query(Job).filter(Job.id == job_id, Job.owner_id == owner_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in (JobStatus.DRAFT, JobStatus.OPEN):
        raise HTTPException(status_code=400, detail="Cannot edit a non-open job")

    skill_ids = data.pop("skill_ids", None)
    for key, val in data.items():
        if val is not None:
            setattr(job, key, val)

    if skill_ids is not None:
        _set_job_skills(db, job.id, skill_ids)

    shadow_project = (
        db.query(Project)
        .filter(
            Project.job_id == job.id,
            Project.proposal_id.is_(None),
            Project.status.in_(tuple(PRE_CONTRACT_PROJECT_STATUSES)),
        )
        .order_by(Project.created_at.desc())
        .first()
    )
    if shadow_project:
        shadow_project.title = job.title
        shadow_project.description = job.description
        shadow_project.total_budget = job.budget
        shadow_project.deadline_date = job.delivery_date

    db.commit()
    db.refresh(job)
    return job


def delete_job(db: Session, job_id: UUID, owner_id: UUID) -> None:
    job = db.query(Job).filter(Job.id == job_id, Job.owner_id == owner_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # UI allows owner to delete draft/open jobs; keep closed deletable for cleanup as well.
    if job.status not in (JobStatus.DRAFT, JobStatus.OPEN, JobStatus.CANCELLED):
        raise HTTPException(status_code=400, detail="Can only delete draft, open, or cancelled jobs")

    proposal_ids = [
        row[0]
        for row in db.query(Proposal.id).filter(Proposal.job_id == job_id).all()
    ]

    # Guard: if contract has already been created from this job/proposals, do not allow hard delete.
    has_project = (
        db.query(Project.id)
        .filter(
            or_(
                and_(
                    Project.job_id == job_id,
                    ~Project.status.in_(tuple(PRE_CONTRACT_PROJECT_STATUSES)),
                ),
                Project.proposal_id.in_(proposal_ids) if proposal_ids else False,
            )
        )
        .first()
    )
    if has_project:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete job after deal/project has been created",
        )

    # Remove pre-contract project rows created from this job.
    db.query(Project).filter(
        Project.job_id == job_id,
        Project.proposal_id.is_(None),
        Project.status.in_(tuple(PRE_CONTRACT_PROJECT_STATUSES)),
    ).delete(synchronize_session=False)

    # Remove deal chat rooms linked to this job/proposals before deleting proposals.
    room_ids = [
        row[0]
        for row in db.query(ChatRoom.id)
        .filter(
            or_(
                ChatRoom.job_id == job_id,
                ChatRoom.proposal_id.in_(proposal_ids) if proposal_ids else False,
            )
        )
        .all()
    ]
    if room_ids:
        # Delete child rooms first to satisfy parent_room_id FK.
        db.query(ChatRoom).filter(ChatRoom.parent_room_id.in_(room_ids)).delete(
            synchronize_session=False
        )
        db.query(ChatRoom).filter(ChatRoom.id.in_(room_ids)).delete(
            synchronize_session=False
        )

    if proposal_ids:
        db.query(Proposal).filter(Proposal.id.in_(proposal_ids)).delete(
            synchronize_session=False
        )

    # Soft-delete: ตั้ง status = DELETED แทนการลบ record
    job.status = JobStatus.CANCELLED
    db.commit()


def get_proposal_count(db: Session, job_id: UUID) -> int:
    return db.query(func.count(Proposal.id)).filter(Proposal.job_id == job_id).scalar() or 0


def close_job(db: Session, job_id: UUID, owner_id: UUID) -> Job:
    """FIX-8: owner ปิด job เอง → cascade reject PENDING proposals ทั้งหมด"""
    job = db.query(Job).filter(Job.id == job_id, Job.owner_id == owner_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.OPEN:
        raise HTTPException(status_code=400, detail="Only open jobs can be closed")

    job.status = JobStatus.CANCELLED
    now = datetime.utcnow()

    pending_proposals = (
        db.query(Proposal)
        .filter(Proposal.job_id == job_id, Proposal.status == ProposalStatus.PENDING)
        .all()
    )
    for p in pending_proposals:
        p.status = ProposalStatus.REJECTED
        p.rejection_reason = "Job was closed by owner"
        p.responded_at = now
        db.add(Notification(
            user_id=p.proposer_id,
            actor_id=owner_id,
            type="proposal_rejected",
            title="Proposal ถูกปฏิเสธ",
            body="งานนี้ถูกปิดโดยเจ้าของงานแล้ว",
            reference_type="proposal",
            reference_id=str(p.id),
            is_read=False,
            created_at=now,
        ))

    db.commit()
    db.refresh(job)
    return job


# ─────────────────────────────────────────────────────────────────
# Proposals
# ─────────────────────────────────────────────────────────────────

def create_proposal(
    db: Session,
    job_id: UUID,
    proposer_id: UUID,
    message: Optional[str],
    proposed_budget: Optional[float],
) -> Proposal:
    job = get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.OPEN:
        raise HTTPException(status_code=400, detail="Job is not open for proposals")
    if job.expires_at and job.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Job has expired")
    existing_project_for_job = (
        db.query(Project)
        .filter(
            Project.job_id == job_id,
            ~Project.status.in_(tuple(PRE_CONTRACT_PROJECT_STATUSES)),
        )
        .first()
    )
    if existing_project_for_job:
        raise HTTPException(status_code=409, detail="This job already has an accepted proposal")
    if str(job.owner_id) == str(proposer_id):
        raise HTTPException(status_code=400, detail="Cannot propose on your own job")

    # Prevent re-submission: same proposer can submit only once per job,
    # regardless of the previous proposal status.
    existing = (
        db.query(Proposal)
        .filter(
            Proposal.job_id == job_id,
            Proposal.proposer_id == proposer_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already submitted a proposal for this job")

    # FIX-10: HIRE jobs require proposer to be KYC-verified (they become the freelancer)
    if job.job_type == JobType.HIRE:
        proposer = db.query(User).filter(User.id == proposer_id).first()
        if not proposer or proposer.kyc_status != "verified":
            raise HTTPException(status_code=403, detail="ต้องยืนยันตัวตน (KYC) ก่อนจึงจะส่ง proposal ได้")

    # SERVICE jobs: check that the job owner (freelancer) is still KYC verified at proposal time
    if job.job_type == JobType.SERVICE:
        job_owner = db.query(User).filter(User.id == job.owner_id).first()
        if not job_owner or job_owner.kyc_status != "verified":
            raise HTTPException(
                status_code=409,
                detail="ไม่สามารถส่ง proposal ได้ เนื่องจาก freelancer ยังไม่ผ่านการยืนยันตัวตน (KYC)"
            )

    # resolve client_id / freelancer_id จาก job_type
    if job.job_type == JobType.HIRE:
        client_id = job.owner_id
        freelancer_id = proposer_id
    else:  # SERVICE — freelancer โพส, client ยื่น
        client_id = proposer_id
        freelancer_id = job.owner_id

    proposal = Proposal(
        job_id=job_id,
        proposer_id=proposer_id,
        client_id=client_id,
        freelancer_id=freelancer_id,
        message=message,
        # Product rule: proposal budget follows job owner's posted budget.
        proposed_budget=job.budget,
        status=ProposalStatus.PENDING,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


def create_direct_proposal(
    db: Session,
    proposer_id: UUID,
    target_user_id: UUID,
    intent: str,
    message: Optional[str],
    proposed_budget: Optional[float],
) -> Proposal:
    """DM deal — job_id = NULL, resolve roles จาก intent"""
    if str(proposer_id) == str(target_user_id):
        raise HTTPException(status_code=400, detail="Cannot create proposal with yourself")

    # intent: 'hire' = proposer เป็น client, 'offer' = proposer เป็น freelancer
    if intent == "hire":
        client_id = proposer_id
        freelancer_id = target_user_id
    else:
        client_id = target_user_id
        freelancer_id = proposer_id

    proposal = Proposal(
        job_id=None,
        proposer_id=proposer_id,
        client_id=client_id,
        freelancer_id=freelancer_id,
        message=message,
        proposed_budget=proposed_budget,
        status=ProposalStatus.PENDING,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


def get_proposal(db: Session, proposal_id: UUID) -> Optional[Proposal]:
    return (
        db.query(Proposal)
        .options(joinedload(Proposal.client), joinedload(Proposal.freelancer))
        .filter(Proposal.id == proposal_id)
        .first()
    )


def list_job_proposals(db: Session, job_id: UUID, owner_id: UUID) -> list[Proposal]:
    """Job owner ดู proposals ของ job ตัวเอง"""
    job = db.query(Job).filter(Job.id == job_id, Job.owner_id == owner_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not your job")
    return (
        db.query(Proposal)
        .options(joinedload(Proposal.client), joinedload(Proposal.freelancer))
        .filter(Proposal.job_id == job_id)
        .order_by(Proposal.created_at.desc())
        .all()
    )


def list_my_proposals(db: Session, user_id: UUID) -> list[Proposal]:
    proposals = (
        db.query(Proposal)
        .options(joinedload(Proposal.client), joinedload(Proposal.freelancer), joinedload(Proposal.job))
        .filter(Proposal.proposer_id == user_id)
        .order_by(Proposal.created_at.desc())
        .all()
    )
    for p in proposals:
        p.job_title = p.job.title if p.job else None
    return proposals


def accept_proposal(
    db: Session, proposal_id: UUID, acceptor_id: UUID
) -> tuple[ChatRoom, int]:
    """
    Accept proposal → เปิด Deal ChatRoom เท่านั้น (ยังไม่สร้าง Project)

    ผู้ accept ต้องเป็น client หรือ freelancer ของ proposal (ไม่ใช่ proposer เสมอ)
    """
    proposal = get_proposal(db, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != ProposalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Proposal is no longer pending")
    existing_project_for_proposal = (
        db.query(Project)
        .filter(Project.proposal_id == proposal.id)
        .first()
    )
    if existing_project_for_proposal:
        raise HTTPException(status_code=409, detail="This proposal has already been accepted")
    if proposal.job_id:
        if proposal.job and proposal.job.status != JobStatus.OPEN:
            raise HTTPException(status_code=400, detail="Job is no longer open")
        existing_project_for_job = (
            db.query(Project)
            .filter(
                Project.job_id == proposal.job_id,
                ~Project.status.in_(tuple(PRE_CONTRACT_PROJECT_STATUSES)),
            )
            .first()
        )
        if existing_project_for_job:
            raise HTTPException(status_code=409, detail="This job already has a freelancer")
        existing_accepted_proposal = (
            db.query(Proposal)
            .filter(
                Proposal.job_id == proposal.job_id,
                Proposal.id != proposal.id,
                Proposal.status == ProposalStatus.ACCEPTED,
            )
            .first()
        )
        if existing_accepted_proposal:
            raise HTTPException(
                status_code=409,
                detail="Another proposal is already in deal negotiation for this job",
            )

    # ตรวจสิทธิ์ — acceptor ต้องเป็นฝั่งตรงข้ามกับ proposer
    if str(acceptor_id) not in (str(proposal.client_id), str(proposal.freelancer_id)):
        raise HTTPException(status_code=403, detail="Not authorized to accept this proposal")
    if str(acceptor_id) == str(proposal.proposer_id):
        raise HTTPException(status_code=400, detail="Cannot accept your own proposal")

    proposal.status = ProposalStatus.ACCEPTED
    proposal.responded_at = datetime.utcnow()

    now = datetime.utcnow()

    # FIX-13: cascade reject all other PENDING proposals for the same job
    auto_rejected_count = 0
    if proposal.job_id:
        other_pending = (
            db.query(Proposal)
            .filter(
                Proposal.job_id == proposal.job_id,
                Proposal.id != proposal.id,
                Proposal.status == ProposalStatus.PENDING,
            )
            .all()
        )
        for other in other_pending:
            other.status = ProposalStatus.REJECTED
            other.rejection_reason = "Another proposal was accepted for this job"
            other.responded_at = now
            db.add(Notification(
                user_id=other.proposer_id,
                actor_id=acceptor_id,
                type="proposal_rejected",
                title="Proposal ถูกปฏิเสธ",
                body="ข้อเสนออื่นถูกเลือกสำหรับงานนี้แล้ว",
                reference_type="proposal",
                reference_id=str(other.id),
                is_read=False,
                created_at=now,
            ))
            auto_rejected_count += 1

    # สร้าง Deal ChatRoom (ใช้คุย/ตกลง milestone ก่อนเปิด project room)
    deal_room = ChatRoom(
        room_type="deal",
        proposal_id=proposal.id,
        project_id=None,
        job_id=proposal.job_id,
        name=f"Deal: {proposal.job.title if proposal.job else 'Direct Proposal'}",
    )
    db.add(deal_room)
    db.flush()

    db.add(ChatParticipant(chat_room_id=deal_room.id, user_id=proposal.client_id))
    db.add(ChatParticipant(chat_room_id=deal_room.id, user_id=proposal.freelancer_id))

    # Notify proposal proposer about acceptance.
    db.add(
        Notification(
            user_id=proposal.proposer_id,
            actor_id=acceptor_id,
            type="proposal_accepted",
            title="Proposal accepted",
            body="Your proposal was accepted and a deal chat has been created.",
            reference_type="proposal",
            reference_id=str(proposal.id),
            is_read=False,
            created_at=now,
        )
    )

    db.commit()
    db.refresh(deal_room)
    return deal_room, auto_rejected_count


def reject_proposal(db: Session, proposal_id: UUID, rejector_id: UUID, reason: Optional[str]) -> Proposal:
    proposal = get_proposal(db, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != ProposalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Proposal is no longer pending")
    if str(rejector_id) not in (str(proposal.client_id), str(proposal.freelancer_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    if str(rejector_id) == str(proposal.proposer_id):
        raise HTTPException(status_code=400, detail="Cannot reject your own proposal")

    proposal.status = ProposalStatus.REJECTED
    proposal.rejection_reason = reason
    proposal.responded_at = datetime.utcnow()

    db.add(Notification(
        user_id=proposal.proposer_id,
        actor_id=rejector_id,
        type="proposal_rejected",
        title="Proposal ถูกปฏิเสธ",
        body="ข้อเสนอของคุณถูกปฏิเสธแล้ว",
        reference_type="proposal",
        reference_id=str(proposal.id),
        is_read=False,
        created_at=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(proposal)
    return proposal


def withdraw_proposal(db: Session, proposal_id: UUID, proposer_id: UUID) -> Proposal:
    proposal = db.query(Proposal).filter(
        Proposal.id == proposal_id,
        Proposal.proposer_id == proposer_id,
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != ProposalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only withdraw pending proposals")

    proposal.status = ProposalStatus.WITHDRAWN
    db.commit()
    db.refresh(proposal)
    return proposal
