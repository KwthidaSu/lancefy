from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.database import get_db
from app.files import service
from app.files.schemas import FileResponse
from app.projects.models import MilestoneSubmissionFile, MilestoneSubmission, Milestone, Project
from app.services.minio_client import minio_client, BUCKET_NAME
from app.users.models import User

router = APIRouter(prefix="/files", tags=["Files"])


def _can_access_file(record, current_user: User, db: Session) -> bool:
    if record.owner_id == current_user.id:
        return True
    participant = (
        db.query(Project.client_id, Project.freelancer_id)
        .join(Milestone, Milestone.project_id == Project.id)
        .join(MilestoneSubmission, MilestoneSubmission.milestone_id == Milestone.id)
        .join(MilestoneSubmissionFile, MilestoneSubmissionFile.submission_id == MilestoneSubmission.id)
        .filter(MilestoneSubmissionFile.file_id == record.id)
        .first()
    )
    if not participant:
        return False
    return (
        str(participant.client_id) == str(current_user.id)
        or str(participant.freelancer_id) == str(current_user.id)
    )


@router.post("/upload", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    context: str | None = None,
    context_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    อัพโหลดไฟล์ไปยัง MinIO แล้วบันทึก File record

    - **context**: ประเภทการใช้งาน เช่น `milestone_submission`, `kyc`, `portfolio`
    - **context_id**: UUID ของ entity (ใส่ทีหลังได้ ถ้า upload ก่อนสร้าง entity)
    """
    return await service.upload_file(
        db=db,
        owner_id=current_user.id,
        file=file,
        context=context,
        context_id=context_id,
    )


@router.get("/{file_id}", response_model=FileResponse)
def get_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = service.get_file(db, file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if not _can_access_file(record, current_user, db):
        raise HTTPException(status_code=403, detail="Not your file")
    return record


@router.get("/{file_id}/content")
def get_file_content(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = service.get_file(db, file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if not _can_access_file(record, current_user, db):
        raise HTTPException(status_code=403, detail="Not allowed")

    response = minio_client.get_object(BUCKET_NAME, record.storage_path)
    headers = {"Content-Disposition": f'inline; filename="{record.original_name}"'}
    return StreamingResponse(
        response,
        media_type=record.mime_type or "application/octet-stream",
        headers=headers,
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service.delete_file(db, file_id=file_id, requester_id=current_user.id)
