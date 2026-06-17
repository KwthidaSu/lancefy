from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, get_optional_user
from app.core.database import get_db
from app.jobs import service
from app.jobs.schemas import (
    CreateDirectProposalRequest,
    CreateJobRequest,
    CreateProposalRequest,
    JobListItem,
    JobResponse,
    PaginatedJobsResponse,
    ProposalResponse,
    RejectProposalRequest,
    UpdateJobRequest,
)
from app.users.models import User

router = APIRouter(tags=["Jobs"])


# ─────────────────────────────────────────────────────────────────
# Jobs
# ─────────────────────────────────────────────────────────────────

@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    body: CreateJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.create_job(
        db=db,
        owner_id=current_user.id,
        job_type=body.job_type,
        title=body.title,
        description=body.description,
        budget=body.budget,
        category_id=body.category_id,
        subcategory_id=body.subcategory_id,
        skill_ids=body.skill_ids,
        tags=body.tags,
        images=body.images,
        expires_at=body.expires_at,
        delivery_date=body.delivery_date,
    )


@router.get("/jobs", response_model=PaginatedJobsResponse)
def browse_jobs(
    job_type: Optional[str] = Query(None, description="hire | service"),
    category_id: Optional[UUID] = None,
    category_slug: Optional[str] = Query(None),
    subcategory_slug: Optional[str] = Query(None),
    search: Optional[str] = Query(None, max_length=200),
    budget_min: Optional[float] = Query(None, ge=0),
    budget_max: Optional[float] = Query(None, ge=0),
    sort: Optional[str] = Query("published_desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Browse job board — public, ไม่ต้อง login"""
    exclude_owner_id = current_user.id if current_user else None
    jobs = service.list_jobs(
        db,
        job_type=job_type,
        category_id=category_id,
        category_slug=category_slug,
        subcategory_slug=subcategory_slug,
        search=search,
        budget_min=budget_min,
        budget_max=budget_max,
        sort=sort,
        exclude_owner_id=exclude_owner_id,
        exclude_taken=True,
        skip=skip,
        limit=limit,
    )
    total = service.count_jobs(
        db,
        job_type=job_type,
        category_id=category_id,
        category_slug=category_slug,
        subcategory_slug=subcategory_slug,
        search=search,
        budget_min=budget_min,
        budget_max=budget_max,
        exclude_owner_id=exclude_owner_id,
        exclude_taken=True,
    )
    return {"data": jobs, "total": total, "skip": skip, "limit": limit}


@router.get("/jobs/mine", response_model=list[JobListItem])
def my_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_jobs(db, owner_id=current_user.id, status=None)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    job = service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # เพิ่ม proposals_count
    job.proposals_count = service.get_proposal_count(db, job_id)
    return job


@router.patch("/jobs/{job_id}", response_model=JobResponse)
def update_job(
    job_id: UUID,
    body: UpdateJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude_none=True)
    return service.update_job(db, job_id=job_id, owner_id=current_user.id, data=data)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service.delete_job(db, job_id=job_id, owner_id=current_user.id)


@router.post("/jobs/{job_id}/close", response_model=JobResponse)
def close_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """FIX-8: owner ปิด job เอง → cascade reject PENDING proposals ทั้งหมด"""
    return service.close_job(db, job_id=job_id, owner_id=current_user.id)


# ─────────────────────────────────────────────────────────────────
# Proposals
# ─────────────────────────────────────────────────────────────────

@router.post("/jobs/{job_id}/proposals", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
def submit_proposal(
    job_id: UUID,
    body: CreateProposalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.create_proposal(
        db=db,
        job_id=job_id,
        proposer_id=current_user.id,
        message=body.message,
        proposed_budget=body.proposed_budget,
    )


@router.get("/jobs/{job_id}/proposals", response_model=list[ProposalResponse])
def list_job_proposals(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Job owner ดู proposals ของ job ตัวเอง"""
    return service.list_job_proposals(db, job_id=job_id, owner_id=current_user.id)


@router.post("/proposals/direct", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
def create_direct_proposal(
    body: CreateDirectProposalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """DM-based deal — สร้าง proposal โดยไม่มี job post"""
    if body.intent not in ("hire", "offer"):
        raise HTTPException(status_code=400, detail="intent must be 'hire' or 'offer'")
    return service.create_direct_proposal(
        db=db,
        proposer_id=current_user.id,
        target_user_id=body.target_user_id,
        intent=body.intent,
        message=body.message,
        proposed_budget=body.proposed_budget,
    )


@router.get("/proposals/mine", response_model=list[ProposalResponse])
def my_proposals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_my_proposals(db, user_id=current_user.id)


@router.get("/proposals/{proposal_id}", response_model=ProposalResponse)
def get_proposal(
    proposal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proposal = service.get_proposal(db, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    # ตรวจสิทธิ์ — เฉพาะ client/freelancer/proposer
    allowed = {str(proposal.client_id), str(proposal.freelancer_id), str(proposal.proposer_id)}
    if str(current_user.id) not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")
    return proposal


@router.patch("/proposals/{proposal_id}/accept", status_code=status.HTTP_200_OK)
def accept_proposal(
    proposal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deal_room, auto_rejected_count = service.accept_proposal(
        db, proposal_id=proposal_id, acceptor_id=current_user.id
    )
    return {
        "message": "Proposal accepted",
        "project_id": None,
        # Backward compatibility for existing frontend callers.
        "project_chat_room_id": str(deal_room.id),
        "deal_chat_room_id": str(deal_room.id),
        "auto_rejected_count": auto_rejected_count,
    }


@router.patch("/proposals/{proposal_id}/reject", response_model=ProposalResponse)
def reject_proposal(
    proposal_id: UUID,
    body: RejectProposalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.reject_proposal(
        db, proposal_id=proposal_id, rejector_id=current_user.id, reason=body.reason
    )


@router.patch("/proposals/{proposal_id}/withdraw", response_model=ProposalResponse)
def withdraw_proposal(
    proposal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.withdraw_proposal(db, proposal_id=proposal_id, proposer_id=current_user.id)
