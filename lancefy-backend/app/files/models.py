import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, INET
from datetime import datetime

from app.core.database import Base


class File(Base):
    __tablename__ = "files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    owner_id = Column(UUID(as_uuid=True), nullable=False)

    original_name = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)

    file_size = Column(Integer)

    storage_provider = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)

    file_url = Column(String, unique=True, nullable=False)

    context = Column(String)
    context_id = Column(String)

    is_temporary = Column(Boolean)
    delete_after = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)


class FileAccessLog(Base):
    __tablename__ = "file_access_logs"

    id = Column(UUID(as_uuid=True), primary_key=True)

    file_id = Column(
        UUID(as_uuid=True),
        ForeignKey("files.id"),
        nullable=False,
    )

    user_id = Column(UUID(as_uuid=True), nullable=False)

    action = Column(String, nullable=False)

    ip_address = Column(INET)
    user_agent = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)