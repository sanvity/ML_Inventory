"""Run history router — CRUD for saved training runs."""

import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.db import RunHistory, get_db

router = APIRouter()


class RunCreate(BaseModel):
    modality:      Optional[str] = None
    model_name:    str
    dataset_name:  Optional[str] = None
    target_column: Optional[str] = None
    feature_count: Optional[int] = None
    metrics:       Optional[dict] = None
    config:        Optional[dict] = None
    user_id:       Optional[str] = None


@router.get("/history")
def list_history(x_session_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Return all saved runs for the current user, newest first."""
    # Get user from session
    from api.routers.auth import get_session_user
    session = get_session_user(x_session_id)
    if not session:
        return []  # Return empty if not authenticated
    
    # Filter by user_id
    rows = db.query(RunHistory).filter(RunHistory.user_id == session["user_id"]).order_by(RunHistory.created_at.desc()).all()
    return [_row_to_dict(r) for r in rows]


@router.get("/history/{run_id}")
def get_run(run_id: str, db: Session = Depends(get_db)):
    """Fetch a single run by ID."""
    run = db.query(RunHistory).filter(RunHistory.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    return _row_to_dict(run)


@router.post("/history", status_code=201)
def save_run(body: RunCreate, x_session_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Save a completed training run to history."""
    # Get user from session
    from api.routers.auth import get_session_user
    session = get_session_user(x_session_id)
    user_id = session["user_id"] if session else body.user_id
    
    run = RunHistory(
        id            = str(uuid.uuid4()),
        created_at    = datetime.utcnow(),
        modality      = body.modality,
        model_name    = body.model_name,
        dataset_name  = body.dataset_name,
        target_column = body.target_column,
        feature_count = body.feature_count,
        metrics       = body.metrics,
        config        = body.config,
        user_id       = user_id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _row_to_dict(run)


@router.delete("/history/{run_id}")
def delete_run(run_id: str, db: Session = Depends(get_db)):
    """Delete a run by ID."""
    run = db.query(RunHistory).filter(RunHistory.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    db.delete(run)
    db.commit()
    return {"deleted": run_id}


def _row_to_dict(row: RunHistory) -> dict:
    return {
        "id":            row.id,
        "created_at":    row.created_at.isoformat() if row.created_at else None,
        "modality":      row.modality,
        "model_name":    row.model_name,
        "dataset_name":  row.dataset_name,
        "target_column": row.target_column,
        "feature_count": row.feature_count,
        "metrics":       row.metrics,
        "config":        row.config,
        "model_artifact": row.model_artifact,
        "user_id":       row.user_id,
    }
