from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("role is required")
        return normalized


class InviteUserResponse(BaseModel):
    message: str
    email: str
    role: str
    expires_at: datetime


class InviteRoleOption(BaseModel):
    value: str
    label: str


class AdminUserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    display_name: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    roles: list[str] = Field(default_factory=list)
    user_group: str
    status: str
    kyc_status: Optional[str] = None
    invitation_status: Optional[str] = None
    invited_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    has_kyc_profile: bool = False


class AdminUserInvitationSummary(BaseModel):
    status: Optional[str] = None
    invited_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    invited_email: Optional[str] = None
    invited_role: Optional[str] = None


class AdminUserDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    display_name: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: Optional[str] = None
    roles: list[str] = Field(default_factory=list)
    user_group: str
    status: str
    kyc_status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    has_kyc_profile: bool = False
    invitation: Optional[AdminUserInvitationSummary] = None


class AdminUserStatusUpdateRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("status is required")
        return normalized


class AdminUserStatusUpdateResponse(BaseModel):
    message: str
    user: AdminUserListItem


class InvitationPreviewResponse(BaseModel):
    email: str
    role: str
    status: str
    invited_at: datetime
    expires_at: datetime


class AcceptInvitationRequest(BaseModel):
    firstname: str = Field(min_length=1, max_length=100)
    lastname: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("firstname", "lastname", "username", mode="before")
    @classmethod
    def strip_text_fields(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip()
        return value


class AcceptInvitationResponse(BaseModel):
    message: str


class FreelanceProfileUpdateRequest(BaseModel):
    tagline: Optional[str] = Field(default=None, max_length=255)
    hourly_rate: Optional[float] = Field(default=None, ge=0)
    is_public: Optional[bool] = None

    @field_validator("tagline", mode="before")
    @classmethod
    def strip_tagline(cls, value: Optional[str]) -> Optional[str]:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value
