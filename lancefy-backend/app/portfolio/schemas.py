from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime


# ── New portfolio schemas ─────────────────────────────────────────────────────

class PortfolioFileResponse(BaseModel):
    id: UUID
    portfolio_id: UUID
    file_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class FreelancerPortfolioResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_public: bool = True
    sort_order: int = 0
    files: List[PortfolioFileResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FreelancerPortfolioCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_public: Optional[bool] = True
    sort_order: Optional[int] = 0


class FreelancerPortfolioUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_public: Optional[bool] = None
    sort_order: Optional[int] = None


# ── Legacy schemas — kept so existing gallery routes still compile ─────────────

class PortfolioItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    images: Optional[List[str]] = []
    skill_tags: Optional[List[str]] = []
    category: Optional[str] = None
    is_public: Optional[bool] = True


class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    skill_tags: Optional[List[str]] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None


class PortfolioItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str] = None
    images: List[str] = []
    skill_tags: List[str] = []
    category: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PortfolioAuthor(BaseModel):
    id: str
    username: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class PortfolioItemWithAuthor(PortfolioItemResponse):
    author: Optional[PortfolioAuthor] = None
    like_count: int = 0
    comment_count: int = 0
    liked_by_me: bool = False


class PortfolioFeedResponse(BaseModel):
    items: List[PortfolioItemWithAuthor]
    total: int = 0
    page: int = 1
    limit: int = 20


class LikeToggleResponse(BaseModel):
    liked: bool
    like_count: int


class CommentAuthor(BaseModel):
    id: str
    username: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: UUID
    portfolio_item_id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    author: Optional[CommentAuthor] = None

    class Config:
        from_attributes = True

    title: str
    description: Optional[str] = None
    images: Optional[List[str]] = []
    skill_tags: Optional[List[str]] = []
    category: Optional[str] = None
    is_public: Optional[bool] = True


class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
    skill_tags: Optional[List[str]] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None


class PortfolioItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str] = None
    images: List[str] = []
    skill_tags: List[str] = []
    category: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PortfolioAuthor(BaseModel):
    id: str
    username: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class PortfolioItemWithAuthor(PortfolioItemResponse):
    author: Optional[PortfolioAuthor] = None
    like_count: int = 0
    comment_count: int = 0
    liked_by_me: bool = False


class PortfolioFeedResponse(BaseModel):
    items: List[PortfolioItemWithAuthor]
    total: int
    page: int
    limit: int


# ── Like / Comment schemas ─────────────────────────────────────────────

class LikeToggleResponse(BaseModel):
    liked: bool
    like_count: int


class CommentAuthor(BaseModel):
    id: str
    username: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: UUID
    portfolio_item_id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    author: Optional[CommentAuthor] = None

    class Config:
        from_attributes = True
