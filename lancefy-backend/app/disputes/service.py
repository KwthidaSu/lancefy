import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger(__name__)

from app.disputes.models import Dispute, DisputeMessage, DisputeMessageType, DisputeResolution, DisputeStatus, Evidence
from app.disputes.schemas import DisputeMarkStatusSchema, DisputeMessageCreateSchema, DisputeOpenSchema, DisputeResolveSchema, EvidenceCreateSchema
from app.notifications.models import Notification
from app.payments import service as payment_service
from app.projects.models import Milestone, MilestoneStatus, Project, ProjectStatus
from app.users.models import User


def _get_dispute_and_verify_party(
    db: Session,
    dispute_id: UUID,
    user_id: UUID,
    require_admin: bool = False,
) -> Dispute:
    dispute = (
        db.query(Dispute)
        .options(joinedload(Dispute.evidences))
        .filter(Dispute.id == dispute_id)
        .first()
    )
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    project = db.query(Project).filter(Project.id == dispute.project_id).first()
    is_party = project and str(user_id) in (str(project.client_id), str(project.freelancer_id))

    if not require_admin and not is_party:
        raise HTTPException(status_code=403, detail="Not a party to this dispute")

    return dispute


def open_dispute(db: Session, user_id: UUID, payload: DisputeOpenSchema) -> Dispute:
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if str(user_id) not in (str(project.client_id), str(project.freelancer_id)):
        raise HTTPException(status_code=403, detail="Not a participant of this project")
    if project.status not in (ProjectStatus.ACTIVE, ProjectStatus.DISPUTED):
        raise HTTPException(status_code=400, detail="Cannot dispute a non-active project")

    # ป้องกัน duplicate open dispute ต่อ milestone
    if payload.milestone_id:
        existing = db.query(Dispute).filter(
            Dispute.milestone_id == payload.milestone_id,
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.REVIEWING]),
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="An open dispute already exists for this milestone")

    dispute = Dispute(
        project_id=payload.project_id,
        milestone_id=payload.milestone_id,
        raised_by=user_id,
        reason=payload.reason,
        reason_detail=payload.reason_detail,
        status=DisputeStatus.OPEN,
    )
    db.add(dispute)

    # Mark project as disputed
    project.status = ProjectStatus.DISPUTED
    if payload.milestone_id:
        ms = db.query(Milestone).filter(Milestone.id == payload.milestone_id).first()
        if ms:
            # FIX-5: cannot raise dispute on milestone that is already approved or paid
            if ms.status in (MilestoneStatus.APPROVED, MilestoneStatus.PAID):
                raise HTTPException(
                    status_code=409,
                    detail="ไม่สามารถเปิด dispute สำหรับ milestone ที่ approved หรือจ่ายไปแล้ว"
                )
            ms.status = MilestoneStatus.SUBMITTED  # freeze ไว้อย่างที่เป็น

    db.flush()  # ensure dispute.id is assigned before using it in Notification

    now = datetime.utcnow()
    # Notify the other party that a dispute has been opened
    other_party_id = project.freelancer_id if str(user_id) == str(project.client_id) else project.client_id
    db.add(Notification(
        user_id=other_party_id,
        actor_id=user_id,
        type="dispute_opened",
        title="มีการเปิด Dispute",
        body=f"คู่สัญญาได้เปิด dispute สำหรับโปรเจกต์ '{project.title}'",
        reference_type="dispute",
        reference_id=str(dispute.id),
        is_read=False,
        created_at=now,
    ))

    db.commit()
    db.refresh(dispute)
    return dispute


def list_my_disputes(db: Session, user_id: UUID) -> list[Dispute]:
    project_ids = (
        db.query(Project.id)
        .filter(
            (Project.client_id == user_id) | (Project.freelancer_id == user_id)
        )
        .subquery()
    )
    return (
        db.query(Dispute)
        .options(joinedload(Dispute.evidences))
        .filter(Dispute.project_id.in_(project_ids))
        .order_by(Dispute.created_at.desc())
        .all()
    )


def get_dispute(db: Session, dispute_id: UUID, user_id: UUID) -> Dispute:
    return _get_dispute_and_verify_party(db, dispute_id, user_id)


def get_dispute_admin(db: Session, dispute_id: UUID) -> Dispute:
    dispute = (
        db.query(Dispute)
        .options(
            joinedload(Dispute.evidences).joinedload(Evidence.submitter),
            joinedload(Dispute.raiser),
        )
        .filter(Dispute.id == dispute_id)
        .first()
    )
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return _enrich_dispute(db, dispute)


def add_evidence(
    db: Session, dispute_id: UUID, user_id: UUID, payload: EvidenceCreateSchema
) -> Evidence:
    dispute = _get_dispute_and_verify_party(db, dispute_id, user_id)
    if dispute.status in (DisputeStatus.RESOLVED, DisputeStatus.REJECTED):
        raise HTTPException(status_code=409, detail="Cannot add evidence to a closed dispute")

    evidence = Evidence(
        dispute_id=dispute_id,
        submitted_by=user_id,
        type=payload.type,
        content=payload.content,
        file_id=payload.file_id,
        created_at=datetime.utcnow(),
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


def _enrich_dispute(db: Session, d: Dispute) -> Dispute:
    """Attach project_title, milestone_title, raiser_name to a Dispute ORM object."""
    project = db.query(Project).filter(Project.id == d.project_id).first()
    if project:
        d.project_title = project.title
    else:
        d.project_title = None

    if d.milestone_id:
        ms = db.query(Milestone).filter(Milestone.id == d.milestone_id).first()
        d.milestone_title = ms.title if ms else None
    else:
        d.milestone_title = None

    if d.raiser:
        d.raiser_name = d.raiser.display_name or d.raiser.username or str(d.raised_by)
        d.raiser_username = d.raiser.username
    else:
        d.raiser_name = None
        d.raiser_username = None

    for ev in d.evidences:
        if ev.submitter:
            ev.submitter_name = ev.submitter.display_name or ev.submitter.username
            ev.submitter_username = ev.submitter.username
        else:
            ev.submitter_name = None
            ev.submitter_username = None

    return d


def mark_reviewing(db: Session, dispute_id: UUID, admin_id: UUID) -> Dispute:
    dispute = (
        db.query(Dispute)
        .options(joinedload(Dispute.evidences), joinedload(Dispute.raiser))
        .filter(Dispute.id == dispute_id)
        .first()
    )
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute.status != DisputeStatus.OPEN:
        raise HTTPException(status_code=409, detail="Dispute is not in OPEN status")
    dispute.status = DisputeStatus.REVIEWING

    # Notify both parties that admin is reviewing
    project = db.query(Project).filter(Project.id == dispute.project_id).first()
    if project:
        now = datetime.utcnow()
        for uid in (project.client_id, project.freelancer_id):
            db.add(Notification(
                user_id=uid,
                actor_id=admin_id,
                type="dispute_opened",
                title="Dispute กำลังถูกตรวจสอบ",
                body="Admin กำลังดำเนินการตรวจสอบ dispute ของคุณ",
                reference_type="dispute",
                reference_id=str(dispute_id),
                is_read=False,
                created_at=now,
            ))

    db.commit()
    db.refresh(dispute)
    return _enrich_dispute(db, dispute)


def list_admin_disputes(db: Session, status: Optional[str] = None) -> list[Dispute]:
    q = (
        db.query(Dispute)
        .options(
            joinedload(Dispute.evidences).joinedload(Evidence.submitter),
            joinedload(Dispute.raiser),
        )
    )
    if status and status != "all":
        q = q.filter(Dispute.status == status)
    disputes = q.order_by(Dispute.created_at.desc()).all()
    for d in disputes:
        _enrich_dispute(db, d)
    return disputes


def resolve_dispute(
    db: Session, dispute_id: UUID, admin_id: UUID, payload: DisputeResolveSchema
) -> Dispute:
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute.status in (DisputeStatus.RESOLVED, DisputeStatus.REJECTED):
        raise HTTPException(status_code=409, detail="Dispute already closed")

    valid_resolutions = [r.value for r in DisputeResolution]
    if payload.resolution not in valid_resolutions:
        raise HTTPException(status_code=400, detail=f"Invalid resolution. Use one of: {valid_resolutions}")

    # rejected ใช้ DisputeStatus.REJECTED ไม่ใช่ RESOLVED
    if payload.resolution == DisputeResolution.REJECTED:
        dispute.status = DisputeStatus.REJECTED
    else:
        dispute.status = DisputeStatus.RESOLVED

    dispute.resolution = payload.resolution
    dispute.resolution_note = payload.resolution_note
    dispute.resolved_by = admin_id
    dispute.resolved_at = datetime.utcnow()

    project = db.query(Project).filter(Project.id == dispute.project_id).first()

    # Execute resolution actions
    if payload.resolution == DisputeResolution.RELEASE and dispute.milestone_id:
        try:
            payment_service.release_escrow(
                db,
                milestone_id=dispute.milestone_id,
                released_by=admin_id,
                allow_non_client_actor=True,
            )
        except HTTPException as exc:
            logger.error(
                "Dispute %s: release_escrow failed for milestone %s: %s",
                dispute_id,
                dispute.milestone_id,
                exc.detail,
            )
            raise HTTPException(status_code=502, detail=f"Payment release failed: {exc.detail}") from exc

    elif payload.resolution == DisputeResolution.REFUND and dispute.milestone_id:
        try:
            payment_service.refund_escrow(
                db,
                milestone_id=dispute.milestone_id,
                released_by=admin_id,
                allow_non_client_actor=True,
            )
        except HTTPException as exc:
            logger.error(
                "Dispute %s: refund_escrow failed for milestone %s: %s",
                dispute_id,
                dispute.milestone_id,
                exc.detail,
            )
            raise HTTPException(status_code=502, detail=f"Payment refund failed: {exc.detail}") from exc
        # FIX-3: REFUND means project is cancelled — do NOT restore to ACTIVE
        if project:
            project.status = ProjectStatus.CANCELLED
            project.completed_at = datetime.utcnow()

    elif payload.resolution == DisputeResolution.EXTEND_DEADLINE and dispute.milestone_id:
        if not payload.new_due_date:
            raise HTTPException(status_code=400, detail="new_due_date is required for extend_deadline resolution")
        ms = db.query(Milestone).filter(Milestone.id == dispute.milestone_id).first()
        if ms:
            ms.due_date = payload.new_due_date
        dispute.new_due_date = payload.new_due_date  # บันทึกลง dispute ด้วย

    elif payload.resolution == DisputeResolution.TERMINATE and project:
        # DIS-6: release escrow to freelancer before closing (work was valid but can't continue)
        if dispute.milestone_id:
            try:
                payment_service.release_escrow(
                    db,
                    milestone_id=dispute.milestone_id,
                    released_by=admin_id,
                    allow_non_client_actor=True,
                )
            except HTTPException as exc:
                logger.error(
                    "Dispute %s: release_escrow (terminate) failed for milestone %s: %s",
                    dispute_id,
                    dispute.milestone_id,
                    exc.detail,
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"Payment release failed during termination: {exc.detail}",
                ) from exc
        project.status = ProjectStatus.CANCELLED
        project.completed_at = datetime.utcnow()

    elif payload.resolution == DisputeResolution.FORCE_APPROVE and dispute.milestone_id:
        # FIX-4: client is unresponsive — admin force-approves the milestone
        try:
            payment_service.release_escrow(
                db,
                milestone_id=dispute.milestone_id,
                released_by=admin_id,
                allow_non_client_actor=True,
            )
        except HTTPException as exc:
            logger.error(
                "Dispute %s: release_escrow (force_approve) failed for milestone %s: %s",
                dispute_id,
                dispute.milestone_id,
                exc.detail,
            )
            raise HTTPException(
                status_code=502,
                detail=f"Payment release failed during force approve: {exc.detail}",
            ) from exc
        ms = db.query(Milestone).filter(Milestone.id == dispute.milestone_id).first()
        if ms:
            ms.status = MilestoneStatus.APPROVED

    # Restore project status ถ้าไม่ terminate, ไม่ refund และไม่ rejected
    if project and project.status == ProjectStatus.DISPUTED and payload.resolution not in (
        DisputeResolution.TERMINATE, DisputeResolution.REFUND, DisputeResolution.REJECTED, DisputeResolution.FORCE_APPROVE
    ):
        project.status = ProjectStatus.ACTIVE
    elif project and project.status == ProjectStatus.DISPUTED and payload.resolution == DisputeResolution.FORCE_APPROVE:
        project.status = ProjectStatus.ACTIVE  # work approved, project continues
    elif project and project.status == ProjectStatus.DISPUTED and payload.resolution == DisputeResolution.REJECTED:
        project.status = ProjectStatus.ACTIVE

    # Notify both parties of resolution
    if project:
        resolution_label = {
            DisputeResolution.RELEASE: "ปล่อยเงินให้ Freelancer",
            DisputeResolution.REFUND: "คืนเงินให้ Client",
            DisputeResolution.EXTEND_DEADLINE: "ขยายเวลา Deadline",
            DisputeResolution.TERMINATE: "ยกเลิก Project",
            DisputeResolution.REJECTED: "Dispute ถูกปฏิเสธ",
            DisputeResolution.FORCE_APPROVE: "อนุมัติงานโดย Admin",
        }.get(payload.resolution, payload.resolution)
        now_notify = datetime.utcnow()
        for uid in (project.client_id, project.freelancer_id):
            db.add(Notification(
                user_id=uid,
                actor_id=admin_id,
                type="dispute_resolved",
                title="Dispute ได้รับการแก้ไขแล้ว",
                body=f"ผลการตัดสิน: {resolution_label}",
                reference_type="dispute",
                reference_id=str(dispute_id),
                is_read=False,
                created_at=now_notify,
            ))

    db.commit()
    db.refresh(dispute)
    return dispute


# ─────────────────────────────────────────────────────────────────
# Dispute Messages
# ─────────────────────────────────────────────────────────────────

def list_messages(db: Session, dispute_id: UUID, user_id: UUID, is_admin: bool = False) -> list[DisputeMessage]:
    """ดึง messages ทั้งหมดของ dispute — party เห็นแค่ info_request + info_reply, admin เห็นทั้งหมด"""
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    if not is_admin:
        project = db.query(Project).filter(Project.id == dispute.project_id).first()
        is_party = project and str(user_id) in (str(project.client_id), str(project.freelancer_id))
        if not is_party:
            raise HTTPException(status_code=403, detail="Not a party to this dispute")

    q = (
        db.query(DisputeMessage)
        .options(joinedload(DisputeMessage.sender))
        .filter(DisputeMessage.dispute_id == dispute_id)
    )
    if not is_admin:
        q = q.filter(DisputeMessage.message_type != DisputeMessageType.ADMIN_NOTE)

    messages = q.order_by(DisputeMessage.created_at).all()
    _enrich_messages(messages)
    return messages


def send_message(
    db: Session,
    dispute_id: UUID,
    sender_id: UUID,
    payload: DisputeMessageCreateSchema,
    is_admin: bool = False,
) -> DisputeMessage:
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute.status in (DisputeStatus.RESOLVED, DisputeStatus.REJECTED):
        raise HTTPException(status_code=409, detail="Cannot message on a closed dispute")

    if is_admin:
        allowed = [t.value for t in DisputeMessageType]
        msg_type = payload.message_type if payload.message_type in allowed else DisputeMessageType.INFO_REQUEST.value
    else:
        project = db.query(Project).filter(Project.id == dispute.project_id).first()
        is_party = project and str(sender_id) in (str(project.client_id), str(project.freelancer_id))
        if not is_party:
            raise HTTPException(status_code=403, detail="Not a party to this dispute")
        msg_type = DisputeMessageType.INFO_REPLY.value

    # Notify the other party about the new message
    project = db.query(Project).filter(Project.id == dispute.project_id).first()
    if project and not is_admin:
        other_id = project.freelancer_id if str(sender_id) == str(project.client_id) else project.client_id
        db.add(Notification(
            user_id=other_id,
            actor_id=sender_id,
            type="message_received",
            title="ข้อความใหม่ใน Dispute",
            body="คู่สัญญาได้ส่งข้อมูลเพิ่มเติมใน dispute",
            reference_type="dispute",
            reference_id=str(dispute_id),
            is_read=False,
            created_at=datetime.utcnow(),
        ))
    elif project and is_admin and msg_type == DisputeMessageType.INFO_REQUEST.value:
        # admin ส่ง INFO_REQUEST → แจ้งทั้ง 2 ฝ่ายว่าต้องการข้อมูลเพิ่มเติม
        for party_id in filter(None, [project.client_id, project.freelancer_id]):
            db.add(Notification(
                user_id=party_id,
                actor_id=sender_id,
                type="dispute_info_request",
                title="Admin ต้องการข้อมูลเพิ่มเติม",
                body="Admin ได้ขอข้อมูลเพิ่มเติมเกี่ยวกับ dispute ของคุณ",
                reference_type="dispute",
                reference_id=str(dispute_id),
                is_read=False,
                created_at=datetime.utcnow(),
            ))

    msg = DisputeMessage(
        dispute_id=dispute_id,
        sender_id=sender_id,
        message_type=msg_type,
        content=payload.content,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    msg = (
        db.query(DisputeMessage)
        .options(joinedload(DisputeMessage.sender))
        .filter(DisputeMessage.id == msg.id)
        .first()
    )
    _enrich_messages([msg])
    return msg


def _enrich_messages(messages: list[DisputeMessage]) -> None:
    for msg in messages:
        if msg.sender:
            msg.sender_name = msg.sender.display_name or msg.sender.username or str(msg.sender_id)
            msg.sender_username = msg.sender.username
            msg.is_admin = getattr(msg.sender, "is_admin", False) or getattr(msg.sender, "role", "") == "admin"
        else:
            msg.sender_name = None
            msg.sender_username = None
            msg.is_admin = False
