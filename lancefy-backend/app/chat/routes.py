import json
import logging
from datetime import datetime
from json import JSONDecodeError
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from minio.error import S3Error
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.storage import storage
from app.auth.deps import get_current_user
from app.users.models import User
from app.chat.models import ChatRoom, ChatParticipant, Message
from app.notifications.routes import create_and_push_notification
from app.notifications.manager import notification_manager
from app.chat.schemas import (
    ChatRoomSchema, 
    MessageSchema, 
    ChatRoomListResponse, 
    UserSearchSchema, 
    ChatRoomCreate,
    ChatRoomUpdate
)
from app.chat.manager import manager
from app.jobs.models import Job, Proposal
from app.projects import service as project_service
from app.projects.models import Project, ProjectStatus
from app.projects.schemas import AcceptOfferSchema

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/plain",
    "video/mp4",
    "application/zip", "application/x-zip-compressed",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

router = APIRouter(prefix="/chat", tags=["Chat"])


def _get_room_for_participant(db: Session, room_id: UUID, user_id: UUID) -> ChatRoom:
    room = (
        db.query(ChatRoom)
        .join(ChatParticipant, ChatParticipant.chat_room_id == ChatRoom.id)
        .filter(
            ChatRoom.id == room_id,
            ChatParticipant.user_id == user_id,
        )
        .first()
    )
    if not room:
        raise HTTPException(status_code=403, detail="Not a participant")
    return room


def _ensure_project_for_deal_room(db: Session, room: ChatRoom, proposal: Proposal) -> Project:
    pre_contract_statuses = ("draft", "open", "expired")
    project = None
    if room.project_id:
        project = db.query(Project).filter(Project.id == room.project_id).first()
    if not project:
        project = db.query(Project).filter(Project.proposal_id == proposal.id).first()
    if not project and proposal.job_id:
        # Reuse pre-contract project created at job-post time.
        project = (
            db.query(Project)
            .filter(
                Project.job_id == proposal.job_id,
                Project.proposal_id.is_(None),
                Project.status.in_(pre_contract_statuses),
            )
            .order_by(Project.created_at.desc())
            .first()
        )
    if project:
        if str(project.client_id) != str(proposal.client_id):
            project.client_id = proposal.client_id
        if not project.proposal_id:
            project.proposal_id = proposal.id
        if not project.freelancer_id:
            project.freelancer_id = proposal.freelancer_id
        if room.project_id != project.id:
            room.project_id = project.id
        return project

    # First accepted milestone in a deal creates the actual project contract.
    job = db.query(Job).filter(Job.id == proposal.job_id).first() if proposal.job_id else None
    project = Project(
        job_id=proposal.job_id,
        proposal_id=proposal.id,
        client_id=proposal.client_id,
        freelancer_id=proposal.freelancer_id,
        title=job.title if job and job.title else f"Deal {str(proposal.id)[:8]}",
        description=job.description if job else proposal.message,
        total_budget=proposal.proposed_budget,
        deadline_date=job.delivery_date if job else None,
        status=ProjectStatus.ACTIVE,
        started_at=datetime.utcnow(),
    )
    db.add(project)
    db.flush()
    room.project_id = project.id
    return project

@router.get("/users/search", response_model=List[UserSearchSchema])
def search_users(
    query: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """ค้นหาผู้ใช้เพื่อเริ่มแชท"""
    users = db.query(User).filter(
        (User.username.ilike(f"%{query}%")) | 
        (User.email.ilike(f"%{query}%")) |
        (User.firstname.ilike(f"%{query}%")) |
        (User.lastname.ilike(f"%{query}%"))
    ).filter(User.id != current_user.id).limit(20).all()
    return users

@router.post("/dm/{user_id}", response_model=ChatRoomSchema)
def create_or_get_dm(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """สร้างหรือดึงห้องแชทส่วนตัว (DM)"""
    # Check if DM already exists
    # Find rooms of type 'dm' where both current_user and user_id are participants
    room = db.query(ChatRoom).join(ChatParticipant).filter(
        ChatRoom.room_type == "dm"
    ).filter(
        ChatRoom.id.in_(
            db.query(ChatParticipant.chat_room_id).filter(ChatParticipant.user_id == current_user.id)
        )
    ).filter(
        ChatRoom.id.in_(
            db.query(ChatParticipant.chat_room_id).filter(ChatParticipant.user_id == user_id)
        )
    ).first()

    if room:
        return {
            "id": room.id,
            "room_type": room.room_type,
            "name": room.name,
            "created_at": room.created_at or datetime.utcnow(),
            "participants": [p.user for p in room.participants],
            "last_message": db.query(Message).filter(Message.chat_room_id == room.id).order_by(Message.created_at.desc()).first()
        }

    # Create new DM room
    now = datetime.utcnow()
    new_room = ChatRoom(room_type="dm", name=None, created_at=now, peer_user_id=user_id)
    db.add(new_room)
    db.flush()

    # Add participants
    p1 = ChatParticipant(chat_room_id=new_room.id, user_id=current_user.id, joined_at=now)
    p2 = ChatParticipant(chat_room_id=new_room.id, user_id=user_id, joined_at=now)
    db.add_all([p1, p2])
    db.commit()
    db.refresh(new_room)
    
    return {
        "id": new_room.id,
        "room_type": new_room.room_type,
        "name": new_room.name,
        "created_at": new_room.created_at,
        "participants": [p.user for p in new_room.participants],
        "last_message": None
    }

@router.post("/rooms", response_model=ChatRoomSchema)
def create_group_room(
    data: ChatRoomCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """สร้างห้องแชทกลุ่ม"""
    now = datetime.utcnow()
    new_room = ChatRoom(room_type="group", name=data.name, created_at=now)
    db.add(new_room)
    db.flush()

    # Add creator
    participants = [ChatParticipant(chat_room_id=new_room.id, user_id=current_user.id, joined_at=now)]
    
    # Add other participants
    for u_id in data.participant_ids:
        if u_id != current_user.id:
            participants.append(ChatParticipant(chat_room_id=new_room.id, user_id=u_id, joined_at=now))
    
    db.add_all(participants)
    db.commit()
    db.refresh(new_room)
    
    return {
        "id": new_room.id,
        "room_type": new_room.room_type,
        "name": new_room.name,
        "created_at": new_room.created_at,
        "participants": [p.user for p in new_room.participants],
        "last_message": None
    }

@router.get("/rooms", response_model=List[ChatRoomSchema])
def get_rooms(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from sqlalchemy.orm import joinedload
    from sqlalchemy import func

    rooms = db.query(ChatRoom).join(ChatParticipant).filter(
        ChatParticipant.user_id == current_user.id
    ).options(
        joinedload(ChatRoom.participants).joinedload(ChatParticipant.user)
    ).all()

    if not rooms:
        return []

    room_ids = [room.id for room in rooms]

    # last message per room
    subquery = (
        db.query(
            Message.chat_room_id,
            func.max(Message.created_at).label("max_created_at")
        )
        .filter(Message.chat_room_id.in_(room_ids))
        .group_by(Message.chat_room_id)
        .subquery()
    )
    last_messages = (
        db.query(Message)
        .join(subquery,
            (Message.chat_room_id == subquery.c.chat_room_id) &
            (Message.created_at == subquery.c.max_created_at)
        )
        .all()
    )
    last_msg_map = {msg.chat_room_id: msg for msg in last_messages}

    # last_read_at per room for current user
    my_participants = db.query(ChatParticipant).filter(
        ChatParticipant.user_id == current_user.id,
        ChatParticipant.chat_room_id.in_(room_ids)
    ).all()
    read_map = {p.chat_room_id: p.last_read_at for p in my_participants}

    # unread count per room
    unread_counts = {}
    for room_id in room_ids:
        last_read = read_map.get(room_id)
        q = db.query(func.count(Message.id)).filter(
            Message.chat_room_id == room_id,
            Message.sender_id != current_user.id
        )
        if last_read:
            q = q.filter(Message.created_at > last_read)
        unread_counts[room_id] = q.scalar() or 0

    # Backfill project_id for legacy deal rooms that only have proposal_id.
    proposal_ids_without_project = [
        room.proposal_id
        for room in rooms
        if room.proposal_id and not room.project_id
    ]
    proposal_to_project_id: dict = {}
    if proposal_ids_without_project:
        project_rows = (
            db.query(Project.proposal_id, Project.id)
            .filter(Project.proposal_id.in_(proposal_ids_without_project))
            .all()
        )
        proposal_to_project_id = {
            row[0]: row[1]
            for row in project_rows
            if row[0] is not None
        }

    response = []
    for room in rooms:
        last_msg = last_msg_map.get(room.id)
        derived_project_id = room.project_id or proposal_to_project_id.get(room.proposal_id)
        response.append({
            "id": room.id,
            "room_type": room.room_type,
            "name": room.name,
            "proposal_id": room.proposal_id,
            "project_id": derived_project_id,
            "parent_room_id": room.parent_room_id,
            "created_at": room.created_at or datetime.utcnow(),
            "participants": [p.user for p in room.participants],
            "last_message": last_msg,
            "unread_count": unread_counts.get(room.id, 0),
            "status": room.status or "active",
        })

    return response


@router.post("/rooms/{room_id}/read")
def mark_room_as_read(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """อัปเดต last_read_at ของ participant เป็นเวลาปัจจุบัน"""
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == current_user.id
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    participant.last_read_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.post("/rooms/{room_id}/promote-project", response_model=ChatRoomSchema)
def promote_deal_to_project_room(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Promote a deal room to a project room:
    - deal room becomes archived
    - create (or return existing) child project room
    """
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.room_type != "deal":
        raise HTTPException(status_code=400, detail="Only deal room can be promoted")

    participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == current_user.id,
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    project_id = room.project_id
    if not project_id and room.proposal_id:
        project = db.query(Project).filter(Project.proposal_id == room.proposal_id).first()
        if project:
            project_id = project.id
    if not project_id:
        raise HTTPException(status_code=400, detail="Project not found for this deal room")

    existing_project_room = db.query(ChatRoom).filter(
        ChatRoom.room_type == "project",
        ChatRoom.parent_room_id == room.id,
        ChatRoom.project_id == project_id,
    ).first()
    if existing_project_room:
        return {
            "id": existing_project_room.id,
            "room_type": existing_project_room.room_type,
            "name": existing_project_room.name,
            "proposal_id": existing_project_room.proposal_id,
            "project_id": existing_project_room.project_id,
            "parent_room_id": existing_project_room.parent_room_id,
            "created_at": existing_project_room.created_at or datetime.utcnow(),
            "participants": [p.user for p in existing_project_room.participants],
            "last_message": db.query(Message).filter(Message.chat_room_id == existing_project_room.id).order_by(Message.created_at.desc()).first(),
            "unread_count": 0,
        }

    room.status = "archived"
    now = datetime.utcnow()
    project = db.query(Project).filter(Project.id == project_id).first()
    project_room = ChatRoom(
        room_type="project",
        proposal_id=room.proposal_id,
        project_id=project_id,
        parent_room_id=room.id,
        name=f"Project: {project.title if project else room.name or 'Project'}",
        created_at=now,
    )
    db.add(project_room)
    db.flush()

    participants = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room.id,
        ChatParticipant.left_at == None,  # noqa: E711
    ).all()
    for p in participants:
        db.add(ChatParticipant(chat_room_id=project_room.id, user_id=p.user_id, joined_at=now))

    db.commit()
    db.refresh(project_room)
    return {
        "id": project_room.id,
        "room_type": project_room.room_type,
        "name": project_room.name,
        "proposal_id": project_room.proposal_id,
        "project_id": project_room.project_id,
        "parent_room_id": project_room.parent_room_id,
        "created_at": project_room.created_at or datetime.utcnow(),
        "participants": [p.user for p in project_room.participants],
        "last_message": db.query(Message).filter(Message.chat_room_id == project_room.id).order_by(Message.created_at.desc()).first(),
        "unread_count": 0,
    }


@router.post("/rooms/{room_id}/offers/{offer_id}/accept")
def accept_deal_offer(
    room_id: UUID,
    offer_id: UUID,
    payload: AcceptOfferSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Accept milestone offer inside Deal Room and apply milestones into Project.
    If project doesn't exist yet, create it from the accepted proposal first.
    """
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.room_type != "deal":
        raise HTTPException(status_code=400, detail="Only deal room can accept milestone offer")

    participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == current_user.id,
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    if not room.proposal_id:
        raise HTTPException(status_code=400, detail="Deal room has no proposal")
    proposal = db.query(Proposal).filter(Proposal.id == room.proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if str(current_user.id) != str(proposal.client_id):
        raise HTTPException(status_code=403, detail="Only proposal client can accept milestone offer")

    project = _ensure_project_for_deal_room(db, room, proposal)

    # Mirror /projects/{project_id}/offers/{offer_id}/accept behavior.
    project_service.accept_offer(
        db=db,
        project_id=project.id,
        offer_id=offer_id,
        client_id=current_user.id,
        payload=payload,
    )
    db.commit()
    db.refresh(project)
    db.refresh(room)
    return {
        "project_id": str(project.id),
        "deal_room_id": str(room.id),
    }


@router.post("/rooms/{room_id}/offers/{offer_id}/freelancer-accept")
def freelancer_accept_deal_offer(
    room_id: UUID,
    offer_id: UUID,
    payload: AcceptOfferSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Freelancer accepts a counter-offer from the client inside a Deal Room.
    Mirrors accept_deal_offer but authorised by freelancer_id instead of client_id.
    """
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.room_type != "deal":
        raise HTTPException(status_code=400, detail="Only deal room can accept milestone offer")

    participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == current_user.id,
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    if not room.proposal_id:
        raise HTTPException(status_code=400, detail="Deal room has no proposal")
    proposal = db.query(Proposal).filter(Proposal.id == room.proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if str(current_user.id) != str(proposal.freelancer_id):
        raise HTTPException(status_code=403, detail="Only proposal freelancer can accept client's counter offer")

    # KYC guard — freelancer ต้องผ่านการยืนยันตัวตนก่อน accept งาน
    if getattr(current_user, "kyc_status", None) != "verified":
        raise HTTPException(status_code=403, detail="ต้องยืนยันตัวตน (KYC) ก่อน accept offer")

    project = _ensure_project_for_deal_room(db, room, proposal)

    # Re-use the same accept_offer logic but supply the proposal client_id for auth.
    project_service.accept_offer(
        db=db,
        project_id=project.id,
        offer_id=offer_id,
        client_id=proposal.client_id,
        payload=payload,
    )
    db.commit()
    db.refresh(project)
    db.refresh(room)
    return {
        "project_id": str(project.id),
        "deal_room_id": str(room.id),
    }


@router.get("/rooms/{room_id}/context")
def get_room_context(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """ดึงข้อมูล context ของห้อง (proposal / project summary) สำหรับ sidebar."""
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Ensure current user is a participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == current_user.id,
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    context: dict = {
        "room_id": str(room.id),
        "room_type": room.room_type,
        "proposal": None,
        "project": None,
    }

    if room.proposal_id:
        proposal = db.query(Proposal).filter(Proposal.id == room.proposal_id).first()
        if proposal:
            # load associated job title if exists
            job = db.query(Job).filter(Job.id == proposal.job_id).first() if proposal.job_id else None
            context["proposal"] = {
                "id": str(proposal.id),
                "status": proposal.status,
                "proposed_budget": float(proposal.proposed_budget) if proposal.proposed_budget is not None else None,
                "message": proposal.message,
                "job_title": job.title if job else None,
            }

    project_id = room.project_id
    if not project_id and room.proposal_id:
        project = (
            db.query(Project)
            .filter(Project.proposal_id == room.proposal_id)
            .first()
        )
        project_id = project.id if project else None

    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            context["project"] = {
                "id": str(project.id),
                "title": project.title,
                "status": project.status,
                "total_budget": float(project.total_budget) if project.total_budget is not None else None,
            }

    return context


@router.get("/rooms/{room_id}/messages", response_model=List[MessageSchema])
def get_messages(
    room_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    before: Optional[datetime] = Query(default=None, description="Cursor: fetch messages before this datetime (ISO 8601)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Check if user is participant
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this room")

    query = db.query(Message).filter(
        Message.chat_room_id == room_id,
        Message.deleted_at == None,
    )
    if before:
        query = query.filter(Message.created_at < before)
    messages = query.order_by(Message.created_at.desc()).limit(limit).all()
    return list(reversed(messages))

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: UUID,
    token: str = Query(..., description="Bearer token for authentication"),
    db: Session = Depends(get_db)
):
    # Authenticate via token query param
    try:
        from app.core.security import verify_token
        from app.users.service import get_or_create_user
        payload = verify_token(token)
        keycloak_user_id = payload.get("sub")
        if not keycloak_user_id:
            await websocket.close(code=4001)
            return
        current_user = get_or_create_user(
            db,
            keycloak_user_id=keycloak_user_id,
            email=payload.get("email"),
            firstname=payload.get("given_name"),
            lastname=payload.get("family_name"),
            username=payload.get("preferred_username"),
        )
    except HTTPException:
        await websocket.close(code=4001)
        return
    except SQLAlchemyError:
        logger.exception("WebSocket auth failed due to database error | room_id=%s", room_id)
        await websocket.close(code=1011)
        return

    # Verify room membership
    participant = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == current_user.id
    ).first()
    if not participant:
        await websocket.close(code=4003)
        return

    await manager.connect(room_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            # ── Ping / keepalive ────────────────────────────────────────
            if raw.strip() in ("ping", "__ping__"):
                await websocket.send_text("pong")
                continue
            try:
                data = json.loads(raw)
            except JSONDecodeError:
                continue
            if not isinstance(data, dict):
                continue
            action = data.get("action", "message")

            # ── Typing indicator ─────────────────────────────────────────
            if action == "typing":
                await manager.broadcast(room_id, {
                    "action": "typing",
                    "user_id": str(current_user.id),
                    "firstname": current_user.firstname or "",
                }, exclude=websocket)
                continue

            if action == "stop_typing":
                await manager.broadcast(room_id, {
                    "action": "stop_typing",
                    "user_id": str(current_user.id),
                }, exclude=websocket)
                continue

            # ── Edit message ─────────────────────────────────────────────
            if action == "edit":
                msg_id = data.get("message_id")
                new_content = data.get("content", "").strip()
                if msg_id and new_content:
                    msg = db.query(Message).filter(
                        Message.id == msg_id,
                        Message.sender_id == current_user.id,
                        Message.deleted_at == None,
                    ).first()
                    if msg:
                        msg.content = new_content
                        msg.edited_at = datetime.utcnow()
                        db.commit()
                        await manager.broadcast(room_id, {
                            "action": "edited",
                            "id": str(msg.id),
                            "content": msg.content,
                            "edited_at": msg.edited_at.isoformat(),
                        })
                continue

            # ── Delete message ────────────────────────────────────────────
            if action == "delete":
                msg_id = data.get("message_id")
                if msg_id:
                    msg = db.query(Message).filter(
                        Message.id == msg_id,
                        Message.sender_id == current_user.id,
                        Message.deleted_at == None,
                    ).first()
                    if msg:
                        msg.deleted_at = datetime.utcnow()
                        db.commit()
                        await manager.broadcast(room_id, {
                            "action": "deleted",
                            "id": str(msg.id),
                        })
                continue

            # ── New message (default) ────────────────────────────────────
            # Use server-verified identity — ignore any client-provided sender_id
            new_msg = Message(
                chat_room_id=room_id,
                sender_id=current_user.id,
                content=data.get("content", ""),
                message_type=data.get("message_type", "text"),
                created_at=datetime.utcnow()
            )
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)
            
            # Broadcast to all in room
            await manager.broadcast(room_id, {
                "id": str(new_msg.id),
                "chat_room_id": str(new_msg.chat_room_id),
                "sender_id": str(new_msg.sender_id),
                "content": new_msg.content,
                "message_type": new_msg.message_type,
                "created_at": new_msg.created_at.isoformat()
            })

            # Push notification to all other participants
            try:
                from app.notifications.models import Notification as NotifModel
                sender = db.query(User).filter(User.id == new_msg.sender_id).first()
                if sender:
                    sender_name = f"{sender.firstname or ''} {sender.lastname or ''}".strip() or f"@{str(sender.id)[:8]}"
                else:
                    sender_name = f"@{str(new_msg.sender_id)[:8]}"
                title = f"ข้อความใหม่จาก {sender_name}"
                preview = new_msg.content if new_msg.message_type == "text" else ("ส่งรูปภาพ" if new_msg.message_type == "image" else "ส่งไฟล์")
                other_participants = db.query(ChatParticipant).filter(
                    ChatParticipant.chat_room_id == room_id,
                    ChatParticipant.user_id != new_msg.sender_id
                ).all()
                for p in other_participants:
                    # ถ้ามี noti ที่ยังไม่อ่านจากห้องเดิมอยู่แล้ว → อัปเดตแทนสร้างใหม่
                    existing = db.query(NotifModel).filter(
                        NotifModel.user_id == p.user_id,
                        NotifModel.type == "message_received",
                        NotifModel.reference_id == str(room_id),
                        NotifModel.is_read == False
                    ).first()
                    if existing:
                        existing.title = title
                        existing.body = preview[:100]
                        existing.created_at = datetime.utcnow()
                        db.commit()
                        await notification_manager.push(str(p.user_id), {
                            "id": str(existing.id),
                            "type": existing.type,
                            "title": existing.title,
                            "body": existing.body,
                            "reference_type": existing.reference_type,
                            "reference_id": existing.reference_id,
                            "is_read": existing.is_read,
                            "created_at": existing.created_at.isoformat(),
                        })
                    else:
                        await create_and_push_notification(
                            db=db,
                            user_id=str(p.user_id),
                            type="message_received",
                            title=title,
                            body=preview[:100],
                            reference_type="message",
                            reference_id=str(room_id)
                        )
            except (HTTPException, RuntimeError, SQLAlchemyError):
                logger.exception("Failed to send chat notification")
    except WebSocketDisconnect:
        pass
    except (RuntimeError, SQLAlchemyError, ValueError):
        logger.exception("WebSocket error in room %s", room_id)
    finally:
        manager.disconnect(room_id, websocket)


@router.post("/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """อัปโหลดไฟล์/รูปภาพสำหรับส่งในแชท"""
    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        )

    file_data = await file.read()

    # Validate file size
    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB."
        )

    file_ext = (file.filename or "file").rsplit(".", 1)[-1].lower()
    unique_filename = f"{uuid4()}.{file_ext}"
    file_url = storage.upload_file(
        file_data,
        unique_filename,
        content_type=file.content_type,
        original_filename=file.filename
    )

    return {
        "url": file_url,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(file_data)
    }

@router.get("/files/{file_name}")
async def get_chat_file(file_name: str):
    """ส่งคืนไฟล์โดยตรงผ่าน backend (Proxy) แทนการ redirect"""
    from fastapi.responses import StreamingResponse
    try:
        meta = storage.get_file_metadata(file_name)
        response = storage.get_file(file_name)
        original_name = meta["original_filename"]
        headers = {
            "Content-Disposition": f'inline; filename="{original_name}"'
        }
        return StreamingResponse(
            response,
            media_type=meta["content_type"] or "application/octet-stream",
            headers=headers
        )
    except S3Error:
        raise HTTPException(status_code=404, detail="File not found")

@router.patch("/rooms/{room_id}", response_model=ChatRoomSchema)
def update_room(
    room_id: UUID,
    data: ChatRoomUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """อัปเดตข้อมูลห้อง (เช่น เปลี่ยนชื่อ)"""
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check if participant
    p = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == current_user.id
    ).first()
    if not p:
        raise HTTPException(status_code=403, detail="Not a participant")

    if data.name:
        room.name = data.name
    
    db.commit()
    db.refresh(room)
    return room

@router.post("/rooms/{room_id}/participants")
def add_participant(
    room_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """?????????????????????????????????????????????"""
    room = _get_room_for_participant(db, room_id, current_user.id)
    if room.room_type != "group":
        raise HTTPException(status_code=400, detail="Participants can only be managed in group rooms")
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="User already in room")
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    exist = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == user_id
    ).first()
    if exist:
        return {"message": "User already in room"}

    new_p = ChatParticipant(chat_room_id=room_id, user_id=user_id)
    db.add(new_p)
    db.commit()
    return {"message": "Added successfully"}

@router.delete("/rooms/{room_id}/participants/{user_id}")
def remove_participant(
    room_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """???????????????????????????????????? ??? ????????????????????????????????????????????????????????????????????????"""
    room = _get_room_for_participant(db, room_id, current_user.id)
    if room.room_type != "group":
        raise HTTPException(status_code=400, detail="Participants can only be managed in group rooms")
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only remove yourself from a room")
    p = db.query(ChatParticipant).filter(
        ChatParticipant.chat_room_id == room_id,
        ChatParticipant.user_id == user_id
    ).first()

    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")

    db.delete(p)
    db.commit()
    return {"message": "Removed successfully"}
