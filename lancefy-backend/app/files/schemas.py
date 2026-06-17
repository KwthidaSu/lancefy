from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FileResponse(BaseModel):
    id: UUID
    original_name: str
    mime_type: str
    file_size: Optional[int] = None
    file_url: str
    context: Optional[str] = None
    context_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
