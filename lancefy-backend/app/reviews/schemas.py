from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from datetime import datetime
from typing import Optional, Any


class ReviewCreateSchema(BaseModel):
    project_id: UUID
    reviewee_id: UUID
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponseSchema(BaseModel):
    id: UUID
    project_id: UUID
    reviewer_id: UUID
    reviewee_id: UUID
    rating: int
    comment: Optional[str]
    is_immutable: bool
    created_at: datetime

    # Populated from joined reviewer User object
    reviewer_username: Optional[str] = None
    reviewer_display_name: Optional[str] = None
    reviewer_avatar_url: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def extract_reviewer_info(cls, data: Any) -> Any:
        if hasattr(data, "reviewer") and data.reviewer is not None:
            u = data.reviewer
            # Convert ORM object to dict-like for pydantic
            if not isinstance(data, dict):
                obj = data.__dict__.copy()
                obj["reviewer_username"] = getattr(u, "username", None)
                obj["reviewer_display_name"] = (
                    getattr(u, "display_name", None)
                    or " ".join(
                        filter(None, [
                            getattr(u, "firstname", None),
                            getattr(u, "lastname", None),
                        ])
                    ).strip()
                    or None
                )
                obj["reviewer_avatar_url"] = getattr(u, "avatar_url", None)
                return obj
        return data


class ReviewStatusSchema(ReviewResponseSchema):
    """ReviewResponseSchema + review_deadline สำหรับ GET /projects/{id}/mine"""
    review_deadline: Optional[datetime] = None

    @classmethod
    def from_review(cls, review: Any, *, review_deadline: Optional[datetime] = None) -> "ReviewStatusSchema":
        obj = cls.model_validate(review)
        obj.review_deadline = review_deadline
        return obj

    class Config:
        from_attributes = True
