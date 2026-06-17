import logging
import os
import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.files.models import File
from app.services.minio_client import delete_file as minio_delete, upload_bytes

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 20 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "video/mp4", "video/webm",
    "image/vnd.adobe.photoshop",
    "application/postscript",
    "application/x-zip-compressed",
    "application/x-rar-compressed",
    "application/vnd.rar",
    "application/x-7z-compressed",
}

ALLOWED_EXTENSIONS = {
    "jpg", "jpeg", "png", "gif", "webp", "svg",
    "pdf", "doc", "docx", "xls", "xlsx", "txt",
    "zip", "rar", "7z",
    "mp4", "webm",
    "psd", "ai",
}


def _normalize_extension(filename: str | None) -> str:
    if not filename:
        return ""
    return os.path.splitext(filename)[1].lower().lstrip(".")


def _sanitize_filename(filename: str | None) -> str:
    base_name = os.path.basename(filename or "upload.bin").strip()
    return base_name or "upload.bin"


async def upload_file(
    db: Session,
    owner_id: uuid.UUID,
    file: UploadFile,
    context: Optional[str] = None,
    context_id: Optional[str] = None,
) -> File:
    safe_filename = _sanitize_filename(file.filename)
    ext = _normalize_extension(safe_filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File extension is not allowed")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    mime_type = (file.content_type or "application/octet-stream").lower()
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="File type is not allowed")

    file_id = uuid.uuid4()
    storage_path = f"{owner_id}/{file_id}.{ext}"

    try:
        file_url = upload_bytes(file_bytes, storage_path, mime_type)
    except RuntimeError as exc:
        logger.exception("Failed to upload file to object storage")
        raise HTTPException(status_code=502, detail="File storage unavailable") from exc

    record = File(
        id=file_id,
        owner_id=owner_id,
        original_name=safe_filename,
        mime_type=mime_type,
        file_size=len(file_bytes),
        storage_provider="minio",
        storage_path=storage_path,
        file_url=file_url,
        context=context,
        context_id=context_id,
        is_temporary=(context_id is None),
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except SQLAlchemyError as exc:
        db.rollback()
        try:
            minio_delete(storage_path)
        except Exception:
            logger.exception("Failed to clean up uploaded object after DB error")
        logger.exception("Failed to persist uploaded file metadata")
        raise HTTPException(status_code=500, detail="Failed to save file metadata") from exc


def get_file(db: Session, file_id: uuid.UUID) -> Optional[File]:
    return db.query(File).filter(File.id == file_id).first()


def delete_file(db: Session, file_id: uuid.UUID, requester_id: uuid.UUID) -> None:
    record = get_file(db, file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if record.owner_id != requester_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    try:
        minio_delete(record.storage_path)
    except Exception:
        logger.exception("Failed to delete object from storage: %s", record.storage_path)

    db.delete(record)
    db.commit()
