from datetime import datetime, timedelta

from app.workers.celery_app import celery_app


@celery_app.task(name="app.tasks.auto_complete.check_auto_complete")
def check_auto_complete():
    """
    FIX-11 — Celery beat task, runs hourly.

    หลัง milestone สุดท้ายถูก approved และ client ยังไม่กด confirm ภายใน
    SLA_PROJECT_AUTO_COMPLETE_DAYS → system auto-complete โปรเจกต์อัตโนมัติ
    """
    from app.core.database import SessionLocal
    from app.core.config import settings
    from app.projects.models import Milestone, MilestoneStatus, Project, ProjectStatus
    from app.notifications.models import Notification

    db = SessionLocal()
    try:
        threshold = datetime.utcnow() - timedelta(days=settings.SLA_PROJECT_AUTO_COMPLETE_DAYS)

        # Find active projects where client has not confirmed completion
        active_projects = (
            db.query(Project)
            .filter(
                Project.status == ProjectStatus.ACTIVE,
                Project.client_completion_confirmed_at == None,  # noqa: E711
            )
            .all()
        )

        completed_count = 0
        for project in active_projects:
            milestones = (
                db.query(Milestone)
                .filter(Milestone.project_id == project.id)
                .all()
            )
            if not milestones:
                continue

            # All milestones must be in a terminal paid/approved state
            all_done = all(
                m.status in (MilestoneStatus.APPROVED, MilestoneStatus.PAID)
                for m in milestones
            )
            if not all_done:
                continue

            # The last milestone must have been approved/paid before the threshold
            last_approved = max(
                (m.updated_at for m in milestones if m.updated_at),
                default=None,
            )
            if last_approved is None or last_approved > threshold:
                continue

            # Auto-complete
            now = datetime.utcnow()
            project.status = ProjectStatus.COMPLETED
            project.client_completion_confirmed_at = now
            project.completed_at = project.completed_at or now

            db.add(Notification(
                user_id=project.client_id,
                actor_id=None,
                type="project_auto_completed",
                title="โปรเจกต์เสร็จสมบูรณ์อัตโนมัติ",
                body=f"โปรเจกต์ '{project.title}' ถูกปิดอัตโนมัติเนื่องจากงานทั้งหมดเสร็จแล้ว",
                reference_type="project",
                reference_id=str(project.id),
                is_read=False,
                created_at=now,
            ))
            db.add(Notification(
                user_id=project.freelancer_id,
                actor_id=None,
                type="project_auto_completed",
                title="โปรเจกต์เสร็จสมบูรณ์อัตโนมัติ",
                body=f"โปรเจกต์ '{project.title}' ถูกปิดอัตโนมัติเนื่องจากงานทั้งหมดเสร็จแล้ว",
                reference_type="project",
                reference_id=str(project.id),
                is_read=False,
                created_at=now,
            ))
            completed_count += 1

        db.commit()
        return f"Auto-completed {completed_count} projects"
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
