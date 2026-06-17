from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict


class NotificationResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    title: str
    body: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedNotificationsResponse(BaseModel):
    data: List[NotificationResponseSchema]
    total: int
    unread_count: int
    page: int
    page_size: int


class NotificationSettingSchema(BaseModel):
    notification_type: str
    in_app_enabled: bool
    email_enabled: bool

    class Config:
        from_attributes = True


class NotificationSettingsResponse(BaseModel):
    """Returns a map of notification_type -> settings for the current user."""
    settings: Dict[str, NotificationSettingSchema]


class NotificationSettingUpdate(BaseModel):
    """PATCH body — partial update for one or more notification types."""
    updates: List[NotificationSettingSchema]
