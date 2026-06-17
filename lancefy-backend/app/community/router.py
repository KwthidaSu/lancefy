"""
Community feed router — Facebook/IG style posts with categories, reactions, and comments.
GET  /community             — public feed (no auth required)
POST /community             — create post (auth required)
PUT  /community/{id}        — edit own post (auth)
DELETE /community/{id}      — soft-delete own post (auth)
POST /community/{id}/reactions  — toggle like on a post (auth)
GET  /community/{id}/comments   — list comments (public)
POST /community/{id}/comments   — add comment (auth)
DELETE /community/comments/{comment_id} — soft-delete own comment (auth)
"""

import uuid as _uuid
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from collections import defaultdict

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import get_current_user
from app.core.database import get_db
from app.community.model import (
    CommunityPost,
    CommunityPostAttachment,
    CommunityPostComment,
    CommunityPostReaction,
    CommunityPostView,
    CommunityReactionType,
)
from app.services.minio_client import upload_bytes
from app.users.models import User

router = APIRouter(prefix="/community", tags=["Community"])

VALID_CATEGORIES = {"general", "artwork", "coding", "design", "writing"}
VALID_SORT = {"latest", "reactions", "views"}
PAGE_SIZE = 10


# ── Notification helper (lazy import to avoid circular) ──────────────────────

def _notify(db, user_id, ntype: str, title: str, body: str,
            ref_type: str = "community", ref_id: str = None):
    """Fire-and-forget notification; never raises."""
    if not user_id:
        return
    try:
        from app.notifications.routes import create_notification_sync
        create_notification_sync(
            db, user_id, ntype, title, body,
            reference_type=ref_type,
            reference_id=str(ref_id) if ref_id else None,
        )
    except Exception:
        pass


# ── Schemas ──────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = "general"
    is_public: Optional[bool] = True


class PostUpdate(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None


class CommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[UUID] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _author_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "username": user.username,
        "firstname": user.firstname,
        "lastname": user.lastname,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
    }


def _reaction_count(db: Session, post_id: UUID) -> int:
    return (
        db.query(CommunityPostReaction)
        .filter(
            CommunityPostReaction.post_id == post_id,
            CommunityPostReaction.comment_id.is_(None),
        )
        .count()
    )


def _comment_count(db: Session, post_id: UUID) -> int:
    return (
        db.query(CommunityPostComment)
        .filter(
            CommunityPostComment.post_id == post_id,
            CommunityPostComment.deleted_at.is_(None),
        )
        .count()
    )


def _serialize_post(post: CommunityPost, db: Session, me_id: Optional[UUID] = None) -> dict:
    images = [
        {"id": str(a.id), "url": a.file_url, "sort_order": a.sort_order}
        for a in sorted(post.attachments, key=lambda x: x.sort_order)
    ]
    reaction_count = _reaction_count(db, post.id)
    comment_count = _comment_count(db, post.id)
    liked_by_me = False
    if me_id:
        liked_by_me = (
            db.query(CommunityPostReaction)
            .filter(
                CommunityPostReaction.post_id == post.id,
                CommunityPostReaction.user_id == me_id,
                CommunityPostReaction.comment_id.is_(None),
            )
            .first()
        ) is not None
    return {
        "id": str(post.id),
        "author_id": str(post.author_id),
        "author": _author_dict(post.author) if post.author else None,
        "category": post.category,
        "content": post.content,
        "is_public": post.is_public,
        "view_count": post.view_count,
        "reaction_count": reaction_count,
        "comment_count": comment_count,
        "liked_by_me": liked_by_me,
        "images": images,
        "created_at": post.created_at.isoformat(),
        "edited_at": post.edited_at.isoformat() if post.edited_at else None,
    }


def _get_current_user_optional(
    db: Session = Depends(get_db),
):
    """Return None when no auth header present (used for public endpoints)."""
    return None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def get_feed(
    category: Optional[str] = Query(None),
    sort: Optional[str] = Query("latest"),
    search: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(PAGE_SIZE, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Public community feed with optional category/sort/search/author_id."""
    query = (
        db.query(CommunityPost)
        .options(joinedload(CommunityPost.author), joinedload(CommunityPost.attachments))
        .filter(
            CommunityPost.deleted_at.is_(None),
        )
    )

    # When filtering by a specific author, include their private posts too
    if author_id:
        try:
            from uuid import UUID as _UUID
            author_uuid = _UUID(author_id)
            query = query.filter(CommunityPost.author_id == author_uuid)
        except (ValueError, AttributeError):
            pass
    else:
        query = query.filter(CommunityPost.is_public == True)

    if category and category in VALID_CATEGORIES:
        query = query.filter(CommunityPost.category == category)

    if search:
        like = f"%{search}%"
        query = query.filter(CommunityPost.content.ilike(like))

    # Sort
    sort_key = (sort or "latest").lower()
    if sort_key == "views":
        query = query.order_by(CommunityPost.view_count.desc(), CommunityPost.created_at.desc())
    elif sort_key == "reactions":
        # Subquery with reaction count would be ideal; for simplicity use view_count as proxy
        # Real implementation: join with reaction counts via subquery
        from sqlalchemy import func, outerjoin
        from sqlalchemy import case as sa_case
        reaction_subq = (
            db.query(
                CommunityPostReaction.post_id,
                func.count(CommunityPostReaction.id).label("cnt"),
            )
            .filter(CommunityPostReaction.comment_id.is_(None))
            .group_by(CommunityPostReaction.post_id)
            .subquery()
        )
        query = (
            query.outerjoin(reaction_subq, CommunityPost.id == reaction_subq.c.post_id)
            .order_by(reaction_subq.c.cnt.desc().nullslast(), CommunityPost.created_at.desc())
        )
    else:
        query = query.order_by(CommunityPost.created_at.desc())

    total = query.count()
    posts = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [_serialize_post(p, db) for p in posts],
        "total": total,
        "page": page,
        "page_size": limit,
    }


@router.post("", status_code=201)
def create_post(
    data: PostCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a community post."""
    if not data.content and not data.content:
        raise HTTPException(status_code=422, detail="content is required")

    category = data.category or "general"
    if category not in VALID_CATEGORIES:
        category = "general"

    post = CommunityPost(
        id=_uuid.uuid4(),
        author_id=user.id,
        category=category,
        content=data.content,
        is_public=data.is_public if data.is_public is not None else True,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    # Reload with relationships
    post = db.query(CommunityPost).options(
        joinedload(CommunityPost.author), joinedload(CommunityPost.attachments)
    ).filter(CommunityPost.id == post.id).first()
    return _serialize_post(post, db, me_id=user.id)


@router.post("/{post_id}/images", status_code=201)
async def upload_post_image(
    post_id: UUID,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an image attachment to a post."""
    post = (
        db.query(CommunityPost)
        .filter(CommunityPost.id == post_id, CommunityPost.author_id == user.id, CommunityPost.deleted_at.is_(None))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    content = await file.read()
    object_name = f"community/{user.id}/{_uuid.uuid4()}-{file.filename}"
    file_url = upload_bytes(content, object_name, file.content_type or "image/jpeg")

    sort_order = (
        db.query(CommunityPostAttachment)
        .filter(CommunityPostAttachment.post_id == post_id)
        .count()
    )
    attachment = CommunityPostAttachment(
        id=_uuid.uuid4(),
        post_id=post.id,
        file_url=file_url,
        file_type="image",
        sort_order=sort_order,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return {"id": str(attachment.id), "url": attachment.file_url, "sort_order": attachment.sort_order}


@router.delete("/{post_id}/images/{image_id}", status_code=204)
def delete_post_image(
    post_id: UUID,
    image_id: UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an image attachment from own post."""
    attachment = (
        db.query(CommunityPostAttachment)
        .join(CommunityPost, CommunityPost.id == CommunityPostAttachment.post_id)
        .filter(
            CommunityPostAttachment.id == image_id,
            CommunityPostAttachment.post_id == post_id,
            CommunityPost.author_id == user.id,
            CommunityPost.deleted_at.is_(None),
        )
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(attachment)
    db.commit()


@router.get("/{post_id}")
def get_post(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a single community post by ID (public)."""
    post = (
        db.query(CommunityPost)
        .options(joinedload(CommunityPost.author), joinedload(CommunityPost.attachments))
        .filter(CommunityPost.id == post_id, CommunityPost.deleted_at.is_(None))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _serialize_post(post, db)


@router.put("/{post_id}")
def update_post(
    post_id: UUID,
    data: PostUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = (
        db.query(CommunityPost)
        .filter(CommunityPost.id == post_id, CommunityPost.author_id == user.id, CommunityPost.deleted_at.is_(None))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    update_data = data.model_dump(exclude_unset=True)
    if "category" in update_data and update_data["category"] not in VALID_CATEGORIES:
        update_data["category"] = "general"

    for k, v in update_data.items():
        setattr(post, k, v)

    post.edited_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    post = db.query(CommunityPost).options(
        joinedload(CommunityPost.author), joinedload(CommunityPost.attachments)
    ).filter(CommunityPost.id == post.id).first()
    return _serialize_post(post, db, me_id=user.id)


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = (
        db.query(CommunityPost)
        .filter(CommunityPost.id == post_id, CommunityPost.author_id == user.id, CommunityPost.deleted_at.is_(None))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.deleted_at = datetime.utcnow()
    db.commit()


@router.post("/{post_id}/reactions")
def toggle_reaction(
    post_id: UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle like on a post. Returns {liked: bool, reaction_count: int}."""
    post = (
        db.query(CommunityPost)
        .filter(CommunityPost.id == post_id, CommunityPost.deleted_at.is_(None))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = (
        db.query(CommunityPostReaction)
        .filter(
            CommunityPostReaction.post_id == post_id,
            CommunityPostReaction.user_id == user.id,
            CommunityPostReaction.comment_id.is_(None),
        )
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        reaction = CommunityPostReaction(
            id=_uuid.uuid4(),
            post_id=post_id,
            user_id=user.id,
            reaction_type=CommunityReactionType.LIKE,
        )
        db.add(reaction)
        db.commit()
        liked = True

    return {"liked": liked, "reaction_count": _reaction_count(db, post_id)}


@router.get("/{post_id}/comments")
def get_comments(
    post_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List top-level comments with their replies for a post (public)."""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id, CommunityPost.deleted_at.is_(None)).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    base = (
        db.query(CommunityPostComment)
        .options(joinedload(CommunityPostComment.author))
        .filter(
            CommunityPostComment.post_id == post_id,
            CommunityPostComment.parent_comment_id.is_(None),
            CommunityPostComment.deleted_at.is_(None),
        )
        .order_by(CommunityPostComment.created_at.asc())
    )
    total = base.count()
    comments = base.offset((page - 1) * limit).limit(limit).all()

    # Batch-load replies for the fetched top-level comments
    comment_ids = [c.id for c in comments]
    all_replies = (
        db.query(CommunityPostComment)
        .options(joinedload(CommunityPostComment.author))
        .filter(
            CommunityPostComment.parent_comment_id.in_(comment_ids),
            CommunityPostComment.deleted_at.is_(None),
        )
        .order_by(CommunityPostComment.created_at.asc())
        .all()
    ) if comment_ids else []

    replies_map: dict = defaultdict(list)
    for r in all_replies:
        replies_map[r.parent_comment_id].append(r)

    def _ser_comment(c, replies=None):
        return {
            "id": str(c.id),
            "post_id": str(c.post_id),
            "user_id": str(c.author_id),
            "parent_comment_id": str(c.parent_comment_id) if c.parent_comment_id else None,
            "content": c.content,
            "author": _author_dict(c.author) if c.author else None,
            "created_at": c.created_at.isoformat(),
            "edited_at": c.edited_at.isoformat() if c.edited_at else None,
            "replies": [_ser_comment(r) for r in (replies or [])],
            "reply_count": len(replies or []),
        }

    return {
        "data": [_ser_comment(c, replies_map.get(c.id, [])) for c in comments],
        "total": total,
    }


@router.post("/{post_id}/comments", status_code=201)
def add_comment(
    post_id: UUID,
    data: CommentCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=422, detail="content is required")

    post = db.query(CommunityPost).filter(CommunityPost.id == post_id, CommunityPost.deleted_at.is_(None)).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = CommunityPostComment(
        id=_uuid.uuid4(),
        post_id=post_id,
        author_id=user.id,
        content=data.content.strip(),
        parent_comment_id=data.parent_comment_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Load author for response
    author = db.query(User).filter(User.id == user.id).first()
    return {
        "id": str(comment.id),
        "post_id": str(comment.post_id),
        "user_id": str(comment.author_id),
        "parent_comment_id": str(comment.parent_comment_id) if comment.parent_comment_id else None,
        "content": comment.content,
        "author": _author_dict(author) if author else None,
        "created_at": comment.created_at.isoformat(),
        "edited_at": None,
        "replies": [],
        "reply_count": 0,
    }


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = (
        db.query(CommunityPostComment)
        .filter(
            CommunityPostComment.id == comment_id,
            CommunityPostComment.author_id == user.id,
            CommunityPostComment.deleted_at.is_(None),
        )
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.deleted_at = datetime.utcnow()
    db.commit()


# ── Admin routes ──────────────────────────────────────────────────────────────

@router.get("/admin/posts")
def admin_list_posts(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="active | hidden | all"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Admin: list all posts including hidden ones."""
    query = (
        db.query(CommunityPost)
        .options(joinedload(CommunityPost.author), joinedload(CommunityPost.attachments))
        .filter(CommunityPost.deleted_at.is_(None))
    )
    if status == "hidden":
        query = query.filter(CommunityPost.is_public == False)  # noqa: E712
    elif status == "active":
        query = query.filter(CommunityPost.is_public == True)   # noqa: E712

    if category and category in VALID_CATEGORIES:
        query = query.filter(CommunityPost.category == category)
    if search:
        query = query.filter(CommunityPost.content.ilike(f"%{search}%"))

    total = query.count()
    posts = (
        query.order_by(CommunityPost.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "data": [_serialize_post(p, db) for p in posts],
        "total": total,
        "page": page,
        "page_size": limit,
    }


@router.get("/admin/posts/{post_id}")
def admin_get_post(post_id: UUID, db: Session = Depends(get_db)):
    """Admin: get single post detail including hidden/deleted."""
    post = (
        db.query(CommunityPost)
        .options(joinedload(CommunityPost.author), joinedload(CommunityPost.attachments))
        .filter(CommunityPost.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _serialize_post(post, db)


@router.patch("/admin/posts/{post_id}/close", status_code=200)
def admin_close_post(
    post_id: UUID,
    reason: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
):
    """Admin: hide post from public feed. Notifies author."""
    post = db.query(CommunityPost).filter(
        CommunityPost.id == post_id, CommunityPost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.is_public = False
    db.commit()
    reason_text = f" เหตุผล: {reason}" if reason else ""
    excerpt = (post.content or "")[:60] + ("..." if len(post.content or "") > 60 else "")
    _notify(
        db, post.author_id,
        "community_post_hidden",
        "โพสของคุณถูกซ่อนชั่วคราว",
        f"Admin ซ่อนโพส \"{excerpt}\" ออกจาก Feed{reason_text}",
        ref_type="community", ref_id=str(post_id),
    )
    return {"ok": True, "is_public": False}


@router.patch("/admin/posts/{post_id}/reopen", status_code=200)
def admin_reopen_post(post_id: UUID, db: Session = Depends(get_db)):
    """Admin: restore hidden post back to public."""
    post = db.query(CommunityPost).filter(
        CommunityPost.id == post_id, CommunityPost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.is_public = True
    db.commit()
    excerpt = (post.content or "")[:60] + ("..." if len(post.content or "") > 60 else "")
    _notify(
        db, post.author_id,
        "community_post_restored",
        "โพสของคุณได้รับการกู้คืนแล้ว ✅",
        f"Admin คืนสถานะโพส \"{excerpt}\" กลับสู่ Feed แล้ว",
        ref_type="community", ref_id=str(post_id),
    )
    return {"ok": True, "is_public": True}


@router.delete("/admin/posts/{post_id}", status_code=204)
def admin_delete_post(
    post_id: UUID,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Admin: force delete any post (soft delete). Notifies author."""
    post = db.query(CommunityPost).filter(
        CommunityPost.id == post_id, CommunityPost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    author_id = post.author_id
    excerpt = (post.content or "")[:60] + ("..." if len(post.content or "") > 60 else "")
    post.deleted_at = datetime.utcnow()
    db.commit()
    reason_text = f" เหตุผล: {reason}" if reason else ""
    _notify(
        db, author_id,
        "community_post_removed",
        "โพสของคุณถูกลบ",
        f"Admin ลบโพส \"{excerpt}\" ออกจากระบบ{reason_text}",
        ref_type="community", ref_id=str(post_id),
    )


@router.get("/admin/posts/{post_id}/comments")
def admin_list_comments(
    post_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Admin: list all active comments for a post."""
    total = (
        db.query(CommunityPostComment)
        .filter(
            CommunityPostComment.post_id == post_id,
            CommunityPostComment.deleted_at.is_(None),
        )
        .count()
    )
    comments = (
        db.query(CommunityPostComment)
        .options(joinedload(CommunityPostComment.author))
        .filter(
            CommunityPostComment.post_id == post_id,
            CommunityPostComment.deleted_at.is_(None),
        )
        .order_by(CommunityPostComment.created_at.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    def _ser(c):
        return {
            "id": str(c.id),
            "content": c.content,
            "author": _author_dict(c.author) if c.author else None,
            "parent_comment_id": str(c.parent_comment_id) if c.parent_comment_id else None,
            "created_at": c.created_at.isoformat(),
        }

    return {"data": [_ser(c) for c in comments], "total": total}


@router.delete("/admin/comments/{comment_id}", status_code=204)
def admin_delete_comment(
    comment_id: UUID,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Admin: force delete any comment. Notifies author."""
    comment = db.query(CommunityPostComment).filter(
        CommunityPostComment.id == comment_id,
        CommunityPostComment.deleted_at.is_(None),
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    author_id = comment.author_id
    post_id_val = comment.post_id
    excerpt = (comment.content or "")[:50] + ("..." if len(comment.content or "") > 50 else "")
    comment.deleted_at = datetime.utcnow()
    db.commit()
    reason_text = f" เหตุผล: {reason}" if reason else ""
    _notify(
        db, author_id,
        "community_comment_removed",
        "Comment ของคุณถูกลบ",
        f"Admin ลบ comment \"{excerpt}\"{reason_text}",
        ref_type="community", ref_id=str(post_id_val),
    )

