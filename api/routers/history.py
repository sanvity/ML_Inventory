"""Run history router — CRUD for saved training runs."""

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.db import RunHistory, get_db

router = APIRouter()


class RunCreate(BaseModel):
    model_name:    str
    dataset_name:  str | None = None
    target_column: str | None = None
    feature_count: int | None = None
    metrics:       dict | None = None
    config:        dict | None = None


@router.get("/history")
def list_history(db: Session = Depends(get_db)):
    """Return all saved runs, newest first."""
    rows = db.query(RunHistory).order_by(RunHistory.created_at.desc()).all()
    return [_row_to_dict(r) for r in rows]


@router.post("/history", status_code=201)
def save_run(body: RunCreate, db: Session = Depends(get_db)):
    """Save a completed training run to history."""
    run = RunHistory(
        id            = str(uuid.uuid4()),
        created_at    = datetime.utcnow(),
        model_name    = body.model_name,
        dataset_name  = body.dataset_name,
        target_column = body.target_column,
        feature_count = body.feature_count,
        metrics       = body.metrics,
        config        = body.config,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _row_to_dict(run)


@router.delete("/history/{run_id}", status_code=204)
def delete_run(run_id: str, db: Session = Depends(get_db)):
    """Delete a run by ID."""
    run = db.query(RunHistory).filter(RunHistory.id == run_id).first()
    if not run:
        raise HTTPException(404, "Run not found.")
    db.delete(run)
    db.commit()


def _row_to_dict(row: RunHistory) -> dict:
    return {
        "id":            row.id,
        "created_at":    row.created_at.isoformat() if row.created_at else None,
        "model_name":    row.model_name,
        "dataset_name":  row.dataset_name,
        "target_column": row.target_column,
        "feature_count": row.feature_count,
        "metrics":       row.metrics,
        "config":        row.config,
    }
