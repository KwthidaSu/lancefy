from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class ChatRoomType(str, enum.Enum):
    DM = "dm"
    DEAL = "deal"       # เจรจาต่อรอง + ตกลง scope/ราคา (1 deal = 1 proposal)
    PROJECT = "project" # ทำงานจริงหลังตกลง contract


class ChatRoomStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"  # Deal Chat เปลี่ยนเป็น archived หลังเปิด project

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    __table_args__ = (
        Index("ix_chat_rooms_type_status", "room_type", "status"),
        Index("ix_chat_rooms_proposal", "proposal_id"),
        Index("ix_chat_rooms_project", "project_id"),
        Index("ix_chat_rooms_parent", "parent_room_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_type = Column(String, nullable=False, comment="dm | deal | project")
    status = Column(
        String,
        default=ChatRoomStatus.ACTIVE,
        nullable=False,
        comment="active | archived",
    )

    # --- Optional refs (soft — nullable) ---

    # [DEPRECATED] job_assignment_id — ใช้ proposal_id แทน
    # job_assignment_id = Column(UUID(as_uuid=True), ForeignKey("job_assignments.id"), nullable=True)

    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id"),
        nullable=True,
        comment="Deal Chat: ref Job ที่สร้าง deal (NULL = เริ่มจาก DM)",
    )
    proposal_id = Column(
        UUID(as_uuid=True),
        ForeignKey("proposals.id"),
        nullable=True,
        comment="Deal Chat: 1 deal room = 1 proposal (owner กด open proposal ถึงสร้าง)",
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id"),
        nullable=True,
        comment="Project Chat: ผูกกับ project หลัง accept deal",
    )
    parent_room_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_rooms.id"),
        nullable=True,
        comment="สายพัน DM → Deal → Project: ref ห้องแม่ (history)",
    )

    peer_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="DM only: peer user ID เพื่อค้นหาห้อง DM ของคู่หน้าได้เร็ว",
    )
    # ปัจจุบันในระบบยังไม่มี group chat มีแค่ dm เท่านั้น มีไว้เผื่ออนาคตถ้าจะเพิ่ม group chat ที่มีชื่อห้องได้ (เช่น ห้องคุยงานที่มีหลายคน) จะได้ไม่ต้องแก้โครงสร้างฐานข้อมูลใหม่อีกครั้ง
    name = Column(String, nullable=True, comment="ชื่อสำหรับ group / Deal / Project chat")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    participants = relationship("ChatParticipant", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")
    child_rooms = relationship(
        "ChatRoom",
        foreign_keys="ChatRoom.parent_room_id",
        back_populates="parent_room",
    )
    parent_room = relationship(
        "ChatRoom",
        foreign_keys="[ChatRoom.parent_room_id]",
        back_populates="child_rooms",
        remote_side="ChatRoom.id",
    )

# ยังไม่ใช้งาน
class ChatParticipant(Base):
    """
    for group chat, we can have multiple participants in one room, and track their last_read_at separately for read receipt purposes. For DM, there will be only 2 participants per room.
    """
    __tablename__ = "chat_participants"
    __table_args__ = (
        UniqueConstraint("chat_room_id", "user_id", name="uq_chat_participant"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_room_id = Column(UUID(as_uuid=True), ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    left_at = Column(DateTime, nullable=True, comment="เวลาออกจากห้อง — NULL = ยังอยู่ในห้อง")
    last_read_at = Column(DateTime, nullable=True, comment="อ่านข้อความล่าสุดถึงเวลานี้ — ใช้คำนวณจำนวนข้อความที่ยังไม่อ่าน")

    room = relationship("ChatRoom", back_populates="participants")
    user = relationship("User")

class Message(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        # query หลัก: ดึงข้อความในห้องเรียงตามเวลา (pagination)
        Index("ix_chat_messages_room_created", "chat_room_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_room_id = Column(UUID(as_uuid=True), ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    message_type = Column(String, default="text", nullable=False, comment="text | file | system")
    content = Column(Text, nullable=False, comment="เนื้อหาข้อความ — ถ้าเป็น file จะเป็น URL หรือ JSON metadata")

    # reply threading
    reply_to_message_id = Column(UUID(as_uuid=True), ForeignKey("chat_messages.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    edited_at = Column(DateTime, nullable=True, comment="เวลาที่แก้ไขข้อความ — set manual ที่ service layer")
    deleted_at = Column(DateTime, nullable=True, comment="soft delete — แสดงเป็น 'deleted message' แทนลบจริง")

    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User")
    read_receipts = relationship("MessageReadReceipt", back_populates="message", cascade="all, delete-orphan")

class MessageReadReceipt(Base):
    """
    เก็บสถานะการอ่านรายข้อความต่อผู้ใช้ 1 record = อ่านแล้ว
    DM: 1 record ต่อข้อความ / Group: N records ต่อข้อความ
    """
    __tablename__ = "message_read_receipts"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_read_receipt"),
        Index("ix_read_receipts_user_message", "user_id", "message_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    message = relationship("Message", back_populates="read_receipts")
    user = relationship("User")