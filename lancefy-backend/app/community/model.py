import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Enum, UniqueConstraint, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from app.core.database import Base
import enum

"""
community post feel like facebook post, instagram post สำหรับโพสพูดคุุยและโชวผลงานของ freelan และ client โดยมีฟีเจอร์หลักๆ ดังนี้ 
- สร้างโพสใหม่พร้อมรูปภาพและข้อความประกอบ 
- แก้ไขโพสของตัวเองได้ 
- ลบโพสของตัวเองได้ 
- แสดงโพสทั้งหมดของผู้ใช้ในหน้าโปรไฟล์
- แสดงผลผ่านการเลือกดูเป็น category ได้ โดย category ที่เพิ่มมาเองจะอยู่ใน general ด้วย หรือสามารถหา category นั้นๆเองได้
- การแสดงผล สามารถแสดงเป็ฯ ล่าสุด มีการตอบสนองมากที่สุด หรือยอดวิวเยอะสุด อะไรทำนองนี้ได้
"""


# --- Enum สำหรับประเภทโพสต์ เช่น artwork, coding, design ---
class CommunityCategory(str, enum.Enum):
    GENERAL = "general"  # โพสต์ทั่วไป
    ARTWORK = "artwork"  # โพสต์งานศิลปะ
    CODING = "coding"    # โพสต์งานเขียนโปรแกรม
    DESIGN = "design"    # โพสต์งานออกแบบ
    WRITING = "writing"  # โพสต์งานเขียน/บทความ

# --- Post (โพสต์ใน community) ---
class CommunityPost(Base):
    __tablename__ = "community_posts"
    __table_args__ = (
        Index("ix_community_posts_category", "category"),
        Index("ix_community_posts_created_at", "created_at"),
        Index("ix_community_posts_author_id", "author_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="ผู้เขียนโพสต์")
    category = Column(String, default="general", comment="ประเภทโพสต์ เช่น general | artwork | coding | design | writing")
    content = Column(Text, nullable=True, comment="เนื้อหาโพสต์ (text)")
    is_public = Column(Boolean, default=True, nullable=False, comment="true = แสดงสาธารณะ, false = เฉพาะตัวเอง")
    view_count = Column(Integer, default=0, nullable=False, comment="จำนวน view แบบ denormalized — increment ที่ service layer ด้วย UPDATE ... SET view_count = view_count + 1")

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="วันที่สร้างโพสต์")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="วันที่ DB row ถูก touch ล่าสุด (รวมถึงการ increment view_count)")
    edited_at = Column(DateTime, nullable=True, comment="วันที่ user แก้ไข content จริงๆ — set manual ที่ service layer เท่านั้น แสดงบน UI ว่า 'แก้ไขแล้ว'")
    deleted_at = Column(DateTime, nullable=True, comment="soft delete — ถ้ามีค่าหมายถึงถูกลบแล้ว")

    # ความสัมพันธ์
    author = relationship("User", backref=backref("community_posts", cascade="all, delete-orphan"))
    comments = relationship("CommunityPostComment", back_populates="post", cascade="all, delete-orphan")
    reactions = relationship("CommunityPostReaction", back_populates="post", cascade="all, delete-orphan")
    attachments = relationship("CommunityPostAttachment", back_populates="post", cascade="all, delete-orphan")

# --- Post Attachment (ไฟล์แนบ เช่น รูปภาพ) ---
class CommunityPostAttachment(Base):
    __tablename__ = "community_post_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    file_url = Column(String, nullable=False, comment="URL ของไฟล์ (เก็บใน MinIO / S3)")
    file_type = Column(String, default="image", nullable=False, comment="ประเภทไฟล์ เช่น image | video | document")
    sort_order = Column(Integer, default=0, nullable=False, comment="ลำดับการแสดงผล — น้อยก่อน")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="วันที่สร้างไฟล์แนบ")

    # ความสัมพันธ์
    post = relationship("CommunityPost", back_populates="attachments")

# --- Comment (คอมเมนต์ใต้โพสต์) ---
class CommunityPostComment(Base):
    __tablename__ = "community_post_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    # reference comment for reply comment สูงสุด 2-3 ชั้น (สามารถปรับได้ตามความต้องการ) โดยใช้ parent_comment_id เชื่อมโยงกับ comment ต้นทางที่ถูกตอบกลับ
    parent_comment_id = Column(UUID(as_uuid=True), ForeignKey("community_post_comments.id", ondelete="CASCADE"), nullable=True, comment="สำหรับคอมเมนต์ที่เป็นการตอบกลับ (reply) จะเก็บ ID ของคอมเมนต์ต้นทางที่ถูกตอบกลับ")
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False, comment="เนื้อหาคอมเมนต์")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="วันที่สร้างคอมเมนต์")
    edited_at = Column(DateTime, nullable=True, comment="วันที่แก้ไข content จริงๆ — set manual ที่ service layer")
    deleted_at = Column(DateTime, nullable=True, comment="soft delete — ถ้ามีค่าหมายถึงถูกลบแล้ว แต่ replies ยังแสดงอยู่ได้")

    # ความสัมพันธ์
    post = relationship("CommunityPost", back_populates="comments")
    author = relationship("User", backref=backref("community_comments", cascade="all, delete-orphan"))
    replies = relationship("CommunityPostComment", backref=backref("parent", remote_side="[CommunityPostComment.id]"), cascade="all, delete-orphan")
    reactions = relationship("CommunityPostReaction", back_populates="comment", cascade="all, delete-orphan")

class CommunityReactionType(str, enum.Enum):
    LIKE = "like"
    DISLIKE = "dislike"

class CommunityPostReaction(Base):
    __tablename__ = "community_post_reactions"
    __table_args__ = (
        # user คนเดียวกัน react post/comment เดียวกันได้ครั้งเดียว
        UniqueConstraint("post_id", "comment_id", "user_id", name="uq_community_reaction"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    comment_id = Column(UUID(as_uuid=True), ForeignKey("community_post_comments.id", ondelete="CASCADE"), nullable=True, comment="ถ้า react ที่ comment จะมีค่า, ถ้า react ที่ post จะเป็น null")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reaction_type = Column(Enum(CommunityReactionType), nullable=False, comment="ประเภทของปฏิกิริยา เช่น like | dislike")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="วันที่สร้างปฏิกิริยา")

    # ความสัมพันธ์
    post = relationship("CommunityPost", back_populates="reactions")
    comment = relationship("CommunityPostComment", back_populates="reactions")
    user = relationship("User", backref=backref("community_reactions", cascade="all, delete-orphan"))

class CommunityPostView(Base):
    __tablename__ = "community_post_views"
    __table_args__ = (
        # เก็บ 1 row ต่อ user ต่อ post — อัปเดต viewed_at แทนการ insert ใหม่
        # logic 30 นาทีทำที่ service layer โดยเช็ค viewed_at ก่อน upsert
        UniqueConstraint("post_id", "user_id", name="uq_community_post_view"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    viewed_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="วันที่ดูโพสต์ล่าสุด — อัปเดตทุกครั้งที่ดู (ใช้กับ logic 30 นาที ที่ service layer)")

    # ความสัมพันธ์
    post = relationship("CommunityPost", backref=backref("views", cascade="all, delete-orphan"))
    user = relationship("User", backref=backref("community_post_views", cascade="all, delete-orphan"))
