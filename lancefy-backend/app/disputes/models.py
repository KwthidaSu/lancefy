import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class DisputeReason(str, enum.Enum):
    WORK_NOT_AS_DESCRIBED   = "work_not_as_described"    # งานไม่ตรงสเปค
    WORK_INCOMPLETE         = "work_incomplete"           # งานส่งไม่ครบ deliverables
    WORK_POOR_QUALITY       = "work_poor_quality"         # คุณภาพต่ำกว่าที่ระบุ
    FREELANCER_UNRESPONSIVE = "freelancer_unresponsive"   # freelancer หายตัว
    MISSED_DEADLINE         = "missed_deadline"           # ส่งงานช้ากว่า deadline
    SCOPE_CHANGED           = "scope_changed"             # client เปลี่ยน scope กลางคัน
    CLIENT_UNRESPONSIVE     = "client_unresponsive"       # client ไม่ตรวจงาน / ไม่ตอบ
    UNFAIR_REJECTION        = "unfair_rejection"          # client reject โดยไม่มีเหตุผล
    CANCELLATION_DISPUTE    = "cancellation_dispute"      # ขอยกเลิก project กลางคัน
    PAYMENT_NOT_RELEASED    = "payment_not_released"      # client ไม่ชำระ milestone
    OTHER                   = "other"


class DisputeStatus(str, enum.Enum):
    OPEN       = "open"        # เพิ่งยื่น รอ admin รับเรื่อง
    REVIEWING  = "reviewing"   # admin กำลังตรวจสอบ evidence
    RESOLVED   = "resolved"    # admin ตัดสินแล้ว
    REJECTED   = "rejected"    # dispute ไม่มีมูล / ยื่นผิดเงื่อนไข


class DisputeResolution(str, enum.Enum):
    RELEASE          = "release"           # escrow → freelancer
    REFUND           = "refund"            # escrow → client
    EXTEND_DEADLINE  = "extend_deadline"   # แก้ milestone.due_date
    FORCE_APPROVE    = "force_approve"     # client หายตัว → approve งาน
    TERMINATE        = "terminate_project" # ยุติ project + refund milestones ที่เหลือ
    REJECTED         = "rejected"          # dispute ไม่มีมูล


class Dispute(Base):
    __tablename__ = "disputes"
    __table_args__ = (
        Index("ix_disputes_project", "project_id"),
        Index("ix_disputes_milestone", "milestone_id"),
        Index("ix_disputes_status", "status"),
        # 1 open dispute ต่อ milestone — enforce ที่ service layer ด้วย
        Index("ix_disputes_milestone_open", "milestone_id", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id"),
        nullable=False,
    )
    milestone_id = Column(
        UUID(as_uuid=True),
        ForeignKey("milestones.id"),
        nullable=True,
        comment="NULL = dispute ระดับ project ทั้งหมด",
    )
    raised_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(
        String(50),
        nullable=False,
        comment="DisputeReason enum",
    )
    reason_detail = Column(Text, nullable=True, comment="คำอธิบายเพิ่มเติมจากผู้ยื่น")

    status = Column(String(20), default=DisputeStatus.OPEN, nullable=False)

    # Admin decision
    resolution = Column(
        String(30),
        nullable=True,
        comment="DisputeResolution enum — set เมื่อ admin ตัดสิน",
    )
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolution_note = Column(Text, nullable=True, comment="หมายเหตุจาก admin")

    # extend_deadline: วันที่ขยายไป (today + N วัน ตอน admin ตัดสิน)
    new_due_date = Column(Date, nullable=True, comment="กำหนดใหม่สำหรับ extend_deadline resolution")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    raiser = relationship("User", foreign_keys=[raised_by])
    resolver = relationship("User", foreign_keys=[resolved_by])
    evidences = relationship(
        "Evidence",
        back_populates="dispute",
        cascade="all, delete-orphan",
    )
    messages = relationship(
        "DisputeMessage",
        back_populates="dispute",
        cascade="all, delete-orphan",
        order_by="DisputeMessage.created_at",
    )


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dispute_id = Column(
        UUID(as_uuid=True),
        ForeignKey("disputes.id", ondelete="CASCADE"),
        nullable=False,
    )
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(String(20), nullable=False, comment="text | file")
    content = Column(Text, nullable=True)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    dispute = relationship("Dispute", back_populates="evidences")
    submitter = relationship("User", foreign_keys=[submitted_by])


class DisputeMessageType(str, enum.Enum):
    INFO_REQUEST = "info_request"   # admin ขอข้อมูลเพิ่ม
    INFO_REPLY   = "info_reply"     # party ตอบกลับ
    ADMIN_NOTE   = "admin_note"     # admin โน้ตภายใน (party ไม่เห็น)


class DisputeMessage(Base):
    """
    Message thread ภายใต้ dispute
    - admin ส่ง info_request → party เห็น notification
    - party ส่ง info_reply → admin เห็น
    - admin ส่ง admin_note → เฉพาะ admin เห็น
    """
    __tablename__ = "dispute_messages"
    __table_args__ = (
        Index("ix_dispute_messages_dispute", "dispute_id"),
        Index("ix_dispute_messages_sender", "sender_id"),
    )

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dispute_id = Column(UUID(as_uuid=True), ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False)
    sender_id  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    message_type = Column(String(20), nullable=False, comment="info_request | info_reply | admin_note")
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    dispute = relationship("Dispute", back_populates="messages")
    sender  = relationship("User", foreign_keys=[sender_id])
