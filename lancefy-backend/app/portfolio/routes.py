import uuid as _uuid
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.database import get_db
from app.portfolio.models import (
    FreelancerPortfolio, PortfolioFile,
)
from app.portfolio.schemas import (
    FreelancerPortfolioCreate,
    FreelancerPortfolioResponse,
    FreelancerPortfolioUpdate,
    PortfolioFileResponse,
)
from app.services.minio_client import upload_bytes
from app.users.models import User

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


def _with_files(db: Session, portfolio: FreelancerPortfolio) -> dict:
    files = (
        db.query(PortfolioFile)
        .filter(PortfolioFile.portfolio_id == portfolio.id)
        .order_by(PortfolioFile.sort_order, PortfolioFile.created_at)
        .all()
    )
    return {
        "id": portfolio.id,
        "user_id": portfolio.user_id,
        "title": portfolio.title,
        "description": portfolio.description,
        "cover_image_url": portfolio.cover_image_url,
        "is_public": portfolio.is_public,
        "sort_order": portfolio.sort_order,
        "created_at": portfolio.created_at,
        "updated_at": portfolio.updated_at,
        "files": files,
    }


# ── Public (multi-folder) ────────────────────────────────────────────────

@router.get("/user/{user_id}/all", response_model=List[FreelancerPortfolioResponse])
def get_user_portfolios(user_id: UUID, db: Session = Depends(get_db)):
    """Return all public portfolio folders for a user."""
    portfolios = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.user_id == user_id, FreelancerPortfolio.is_public == True)
        .order_by(FreelancerPortfolio.sort_order, FreelancerPortfolio.created_at)
        .all()
    )
    return [_with_files(db, p) for p in portfolios]


# ── Authenticated (multi-folder) ──────────────────────────────────────────

@router.get("/mine/all", response_model=List[FreelancerPortfolioResponse])
def get_my_portfolios(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return all of the current user's portfolio folders (including private)."""
    portfolios = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.user_id == user.id)
        .order_by(FreelancerPortfolio.sort_order, FreelancerPortfolio.created_at)
        .all()
    )
    return [_with_files(db, p) for p in portfolios]


@router.post("/mine", response_model=FreelancerPortfolioResponse, status_code=201)
def create_portfolio(
    data: FreelancerPortfolioCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new portfolio folder."""
    portfolio = FreelancerPortfolio(
        id=_uuid.uuid4(),
        user_id=user.id,
        title=data.title,
        description=data.description,
        cover_image_url=data.cover_image_url,
        is_public=data.is_public if data.is_public is not None else True,
        sort_order=data.sort_order or 0,
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return _with_files(db, portfolio)


@router.get("/mine/{portfolio_id}", response_model=FreelancerPortfolioResponse)
def get_my_portfolio(
    portfolio_id: UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.id == portfolio_id, FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return _with_files(db, portfolio)


@router.patch("/mine/{portfolio_id}", response_model=FreelancerPortfolioResponse)
def update_portfolio(
    portfolio_id: UUID,
    data: FreelancerPortfolioUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.id == portfolio_id, FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(portfolio, k, v)
    portfolio.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(portfolio)
    return _with_files(db, portfolio)


@router.delete("/mine/{portfolio_id}", status_code=204)
def delete_portfolio(
    portfolio_id: UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.id == portfolio_id, FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    db.delete(portfolio)
    db.commit()


@router.post("/mine/{portfolio_id}/files", response_model=PortfolioFileResponse, status_code=201)
async def upload_portfolio_file(
    portfolio_id: UUID,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.id == portfolio_id, FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    content = await file.read()
    object_name = f"portfolio/{user.id}/{_uuid.uuid4()}-{file.filename}"
    file_url = upload_bytes(content, object_name, file.content_type or "image/jpeg")

    pf = PortfolioFile(
        id=_uuid.uuid4(),
        portfolio_id=portfolio.id,
        file_url=file_url,
    )
    db.add(pf)
    db.commit()
    db.refresh(pf)
    return pf


@router.delete("/mine/{portfolio_id}/files/{file_id}", status_code=204)
def delete_portfolio_file(
    portfolio_id: UUID,
    file_id: UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.id == portfolio_id, FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    pf = (
        db.query(PortfolioFile)
        .filter(
            PortfolioFile.id == file_id,
            PortfolioFile.portfolio_id == portfolio.id,
        )
        .first()
    )
    if not pf:
        raise HTTPException(status_code=404, detail="File not found")

    db.delete(pf)
    db.commit()


# �� Public �������������������������������������������������������������������

@router.get("/user/{user_id}", response_model=FreelancerPortfolioResponse)
def get_user_portfolio(user_id: UUID, db: Session = Depends(get_db)):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(
            FreelancerPortfolio.user_id == user_id,
            FreelancerPortfolio.is_public == True,
        )
        .order_by(FreelancerPortfolio.sort_order, FreelancerPortfolio.created_at)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return _with_files(db, portfolio)


# �� Authenticated �������������������������������������������������������������

@router.get("/mine", response_model=FreelancerPortfolioResponse)
def get_my_portfolio(user=Depends(get_current_user), db: Session = Depends(get_db)):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio yet")
    return _with_files(db, portfolio)


@router.put("/mine", response_model=FreelancerPortfolioResponse)
def upsert_my_portfolio(
    data: FreelancerPortfolioUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        portfolio = FreelancerPortfolio(
            id=_uuid.uuid4(),
            user_id=user.id,
            title=data.title or "My Portfolio",
            description=data.description,
        )
        db.add(portfolio)
    else:
        if data.title is not None:
            portfolio.title = data.title
        if data.description is not None:
            portfolio.description = data.description
        portfolio.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(portfolio)
    return _with_files(db, portfolio)


@router.post("/mine/files", response_model=PortfolioFileResponse, status_code=201)
async def upload_portfolio_file(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Auto-create portfolio on first upload
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        portfolio = FreelancerPortfolio(
            id=_uuid.uuid4(),
            user_id=user.id,
            title="My Portfolio",
        )
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)

    content = await file.read()
    object_name = f"portfolio/{user.id}/{_uuid.uuid4()}-{file.filename}"
    file_url = upload_bytes(content, object_name, file.content_type or "image/jpeg")

    pf = PortfolioFile(
        id=_uuid.uuid4(),
        portfolio_id=portfolio.id,
        file_url=file_url,
    )
    db.add(pf)
    db.commit()
    db.refresh(pf)
    return pf


@router.delete("/mine/files/{file_id}", status_code=204)
def delete_portfolio_file(
    file_id: UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = (
        db.query(FreelancerPortfolio)
        .filter(FreelancerPortfolio.user_id == user.id)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    pf = (
        db.query(PortfolioFile)
        .filter(
            PortfolioFile.id == file_id,
            PortfolioFile.portfolio_id == portfolio.id,
        )
        .first()
    )
    if not pf:
        raise HTTPException(status_code=404, detail="File not found")

    db.delete(pf)
    db.commit()

