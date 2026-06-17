from datetime import datetime, timedelta

from app.workers.celery_app import celery_app


@celery_app.task(name="app.tasks.auto_cancel_unfunded.check_auto_cancel_unfunded")
def check_auto_cancel_unfunded():
    """
    FIX-12 — Celery beat task, runs hourly.

    ถ้า client ไม่จ่าย escrow ภายใน SLA_MILESTONE_FUNDING_DAYS วันหลัง milestone ถูกสร้าง
    → ยกเลิก project อัตโนมัติ (milestone ยังคง UNFUNDED อยู่)

    ข้ามถ้า project มี open dispute หรือ milestone ถูก fund ไปแล้ว
    """
    from app.core.database import SessionLocal
    from app.core.config import settings
    from app.payments import service as payment_service
    from app.projects.models import Milestone, MilestoneFundingStatus, MilestoneStatus, Project, ProjectStatus
    from app.notifications.models import Notification
    from app.disputes.models import Dispute, DisputeStatus

    db = SessionLocal()
    try:
        threshold = datetime.utcnow() - timedelta(days=settings.SLA_MILESTONE_FUNDING_DAYS)

        # Find ACTIVE projects that have at least one PENDING+UNFUNDED milestone older than threshold
        active_projects = (
            db.query(Project)
            .filter(Project.status == ProjectStatus.ACTIVE)
            .all()
        )

        cancelled_count = 0
        now = datetime.utcnow()

        for project in active_projects:
            # Skip if project has any open dispute
            has_open_dispute = (
                db.query(Dispute)
                .filter(
                    Dispute.project_id == project.id,
                    Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.REVIEWING]),
                )
                .first()
            )
            if has_open_dispute:
                continue

            # Find the first PENDING+UNFUNDED milestone
            unfunded_overdue = (
                db.query(Milestone)
                .filter(
                    Milestone.project_id == project.id,
                    Milestone.status == MilestoneStatus.PENDING,
                    Milestone.funding_status == MilestoneFundingStatus.UNFUNDED,
                    Milestone.created_at <= threshold,
                )
                .first()
            )
            if not unfunded_overdue:
                continue

            # Refund any already-funded milestones (defensive: shouldn't exist but handle anyway)
            all_milestones = db.query(Milestone).filter(Milestone.project_id == project.id).all()
            for m in all_milestones:
                if m.funding_status == MilestoneFundingStatus.FUNDED:
                    try:
                        payment_service.refund_escrow(db, milestone_id=m.id, released_by=None)
                    except Exception:
                        pass

            project.status = ProjectStatus.CANCELLED
            project.completed_at = now

            db.add(Notification(
                user_id=project.client_id,
                actor_id=None,
                type="project_completed",
                title="โปรเจกต์ถูกยกเลิกอัตโนมัติ",
                body=f"โปรเจกต์ '{project.title}' ถูกยกเลิกเนื่องจากไม่มีการวาง escrow ภายใน {settings.SLA_MILESTONE_FUNDING_DAYS} วัน",
                reference_type="project",
                reference_id=str(project.id),
                is_read=False,
                created_at=now,
            ))
            db.add(Notification(
                user_id=project.freelancer_id,
                actor_id=None,
                type="project_completed",
                title="โปรเจกต์ถูกยกเลิกอัตโนมัติ",
                body=f"โปรเจกต์ '{project.title}' ถูกยกเลิกเนื่องจาก client ไม่วาง escrow ภายใน {settings.SLA_MILESTONE_FUNDING_DAYS} วัน",
                reference_type="project",
                reference_id=str(project.id),
                is_read=False,
                created_at=now,
            ))
            cancelled_count += 1

        db.commit()
        return f"Auto-cancelled {cancelled_count} projects due to unfunded milestones"
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
