from datetime import datetime

from app.workers.celery_app import celery_app


@celery_app.task(name="app.tasks.auto_close_deals.check_auto_close_deals")
def check_auto_close_deals():
    """
    FIX-16 — Celery beat task, runs hourly.

    ปิด Deal ChatRoom ที่ยังเป็น ACTIVE เมื่อ Job ที่ผูกอยู่ expired/closed
    และ reject ACCEPTED proposal ที่ยังไม่ได้โปรโมตเป็น project
    ป้องกัน "stale deal" ที่ค้างอยู่หลัง job หมดอายุ
    """
    from app.core.database import SessionLocal
    from app.chat.models import ChatRoom, ChatRoomStatus
    from app.jobs.models import Job, JobStatus, Proposal, ProposalStatus
    from app.notifications.models import Notification
    from app.projects.models import Project

    db = SessionLocal()
    try:
        stale_expired_statuses = (JobStatus.CANCELLED,)

        # Find ACTIVE deal chat rooms linked to expired/closed jobs
        stale_rooms = (
            db.query(ChatRoom)
            .join(Job, ChatRoom.job_id == Job.id)
            .filter(
                ChatRoom.room_type == "deal",
                ChatRoom.status == ChatRoomStatus.ACTIVE,
                Job.status.in_(stale_expired_statuses),
            )
            .all()
        )

        closed_count = 0
        now = datetime.utcnow()

        for room in stale_rooms:
            room.status = ChatRoomStatus.ARCHIVED

            # Reject the linked ACCEPTED proposal if it never became a project
            if room.proposal_id:
                proposal = (
                    db.query(Proposal)
                    .filter(
                        Proposal.id == room.proposal_id,
                        Proposal.status == ProposalStatus.ACCEPTED,
                    )
                    .first()
                )
                if proposal:
                    # Only reject if NOT yet promoted to an active project
                    project = (
                        db.query(Project)
                        .filter(Project.proposal_id == proposal.id)
                        .first()
                    )
                    if not project:
                        proposal.status = ProposalStatus.REJECTED
                        proposal.rejection_reason = "Job expired before deal was confirmed"
                        proposal.responded_at = now
                        db.add(Notification(
                            user_id=proposal.proposer_id,
                            actor_id=None,
                            type="proposal_rejected",
                            title="Deal ถูกยกเลิกอัตโนมัติ",
                            body="งานที่เกี่ยวข้องหมดอายุแล้ว deal นี้จึงถูกยกเลิกอัตโนมัติ",
                            reference_type="proposal",
                            reference_id=str(proposal.id),
                            is_read=False,
                            created_at=now,
                        ))

            closed_count += 1

        # Also reject PENDING proposals (not yet in a deal) for expired/closed jobs
        pending_on_expired = (
            db.query(Proposal)
            .join(Job, Proposal.job_id == Job.id)
            .filter(
                Proposal.status == ProposalStatus.PENDING,
                Job.status.in_(stale_expired_statuses),
            )
            .all()
        )
        rejected_pending_count = 0
        for proposal in pending_on_expired:
            proposal.status = ProposalStatus.REJECTED
            proposal.rejection_reason = "Job expired"
            proposal.responded_at = now
            db.add(Notification(
                user_id=proposal.proposer_id,
                actor_id=None,
                type="proposal_rejected",
                title="Proposal ถูกยกเลิก",
                body="งานที่คุณสมัครหมดอายุแล้ว proposal จึงถูกยกเลิกอัตโนมัติ",
                reference_type="proposal",
                reference_id=str(proposal.id),
                is_read=False,
                created_at=now,
            ))
            rejected_pending_count += 1

        db.commit()
        return f"Closed {closed_count} stale deal rooms, rejected {rejected_pending_count} pending proposals on expired jobs"
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
