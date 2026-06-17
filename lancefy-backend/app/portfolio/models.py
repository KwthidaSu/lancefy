import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

# แฟ้มสะสมผลงานสำหรับ freelancer 
class FreelancerPortfolio(Base):
    """
    bucket portfolio ของ freelancer แต่ละคน 
    สามารถมีได้หลายแฟ้มต่อ 1 user เช่น แยกตามประเภทงาน design / coding / writing
    """
    __tablename__ = "freelancer_portfolios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False, default="My Portfolio")
    description = Column(Text, nullable=True)
    cover_image_url = Column(String, nullable=True)
    is_public = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    # audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PortfolioFile(Base):
    """
    เก็บรูปภาพของผลงานชุดนั้นๆ โดยเชื่อมโยงกับ FreelancerPortfolio ผ่าน portfolio_id
    """
    __tablename__ = "portfolio_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey("freelancer_portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    # file path หรือ URL ที่ชี้ไปยังไฟล์ที่เก็บใน MinIO only for jpg, png, อื่นรูปภาพ ไม่เก็บไฟล์โดยตรงใน DB
    file_url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)

    # audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
