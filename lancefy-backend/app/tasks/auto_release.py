from datetime import datetime, timedelta

from app.workers.celery_app import celery_app


@celery_app.task(name="app.tasks.auto_release.check_auto_release")
def check_auto_release():
    """
    Celery beat task — runs hourly.

    1. client ไม่ตรวจงานภายใน SLA_CLIENT_REVIEW_DAYS หลัง freelancer submit
       → mark auto_release_eligible = True (admin confirm ก่อน release จริง)

    2. ข้าม milestone ที่มี open dispute อยู่ — รอ admin resolve ก่อน
    """
    from app.core.database import SessionLocal
    from app.core.config import settings
    from app.projects.models import MilestoneSubmission, Milestone, Project
    from app.disputes.models import Dispute

    db = SessionLocal()
    try:
        threshold = datetime.utcnow() - timedelta(days=settings.SLA_CLIENT_REVIEW_DAYS)

        pending = (
            db.query(MilestoneSubmission)
            .filter(
                MilestoneSubmission.status == "pending",
                MilestoneSubmission.submitted_at <= threshold,
                MilestoneSubmission.auto_release_eligible == False,
            )
            .all()
        )

        flagged = 0
        for submission in pending:
            # ข้ามถ้ามี open dispute อยู่
            has_dispute = (
                db.query(Dispute)
                .filter(
                    Dispute.milestone_id == submission.milestone_id,
                    Dispute.status == "open",
                )
                .first()
            )
            if has_dispute:
                continue

            submission.auto_release_eligible = True
            flagged += 1

        db.commit()
        return f"Flagged {flagged} submissions as auto_release_eligible"
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
