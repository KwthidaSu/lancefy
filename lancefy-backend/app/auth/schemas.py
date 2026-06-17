from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class UserResponse(BaseModel):
    """Full user profile returned to the authenticated user."""
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    kyc_status: Optional[str] = None
    # Freelance fields (from UserFreelanceSkill)
    tagline: Optional[str] = None
    tags: Optional[List[str]] = None
    skills: Optional[List[dict]] = None
    hourly_rate: Optional[float] = None
    is_public: Optional[bool] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Fields that can be updated via PATCH /auth/user."""
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    display_name: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    # Freelance fields — stored in UserFreelanceSkill (skills managed via PUT /users/me/skills)
    tagline: Optional[str] = None
    tags: Optional[List[str]] = None
    hourly_rate: Optional[float] = None
    is_public: Optional[bool] = None


class PublicUserResponse(BaseModel):
    """Public freelancer profile for browse/detail views."""
    id: str
    display_name: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    kyc_status: Optional[str] = None
    # Freelance fields
    tagline: Optional[str] = None
    skills: Optional[List[str]] = None
    hourly_rate: Optional[float] = None
    is_public: Optional[bool] = None

    class Config:
        from_attributes = True
