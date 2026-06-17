from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class MessageSchema(BaseModel):
    id: UUID
    chat_room_id: UUID
    sender_id: UUID
    message_type: str
    content: str
    created_at: datetime
    edited_at: Optional[datetime] = None
    reply_to_message_id: Optional[UUID] = None

    class Config:
        from_attributes = True

class UserSearchSchema(BaseModel):
    id: UUID
    username: Optional[str]
    email: Optional[str]
    firstname: Optional[str]
    lastname: Optional[str]

    class Config:
        from_attributes = True

class ChatRoomSchema(BaseModel):
    id: UUID
    room_type: str
    status: str = "active"
    name: Optional[str] = None
    proposal_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    parent_room_id: Optional[UUID] = None
    created_at: datetime
    last_message: Optional[MessageSchema] = None
    participants: List[UserSearchSchema] = []
    unread_count: int = 0

    class Config:
        from_attributes = True

class ChatRoomListResponse(BaseModel):
    rooms: List[ChatRoomSchema]

class MessageCreateRequest(BaseModel):
    content: str
    message_type: str = "text"

class ChatRoomCreate(BaseModel):
    name: Optional[str] = None
    room_type: str = "group"
    participant_ids: List[UUID]

class ChatRoomUpdate(BaseModel):
    name: Optional[str] = None
