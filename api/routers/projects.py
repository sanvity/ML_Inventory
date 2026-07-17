"""Projects router — CRUD for saved ML projects."""

import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.db import Project, get_db

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    user_id: str
    dataset_name: str
    dataset_data: Optional[dict] = None
    project_state: Optional[dict] = None
    results_data: Optional[dict] = None
    instance_count: Optional[int] = 0
    completed: Optional[int] = 0
    description: Optional[str] = None
    folder: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    dataset_data: Optional[dict] = None
    project_state: Optional[dict] = None
    results_data: Optional[dict] = None
    instance_count: Optional[int] = None
    completed: Optional[int] = None
    description: Optional[str] = None
    folder: Optional[str] = None



@router.get("/projects")
def list_projects(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Return all projects for a user, newest first. If no user_id, return all (admin)."""
    query = db.query(Project)
    if user_id:
        query = query.filter(Project.user_id == user_id)
    rows = query.order_by(Project.created_at.desc()).all()
    return [_row_to_dict(r) for r in rows]


@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    """Fetch a single project by ID."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return _row_to_dict(project)


@router.post("/projects", status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project. Check for name conflicts."""
    # Check if project with same name exists for this user
    existing = db.query(Project).filter(
        Project.name == body.name,
        Project.user_id == body.user_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A project named '{body.name}' already exists. Please choose a different name."
        )
    
    project = Project(
        id = str(uuid.uuid4()),
        name = body.name,
        user_id = body.user_id,
        created_at = datetime.utcnow(),
        updated_at = datetime.utcnow(),
        dataset_name = body.dataset_name,
        dataset_data = body.dataset_data,
        project_state = body.project_state,
        results_data = body.results_data,
        instance_count = body.instance_count or 0,
        completed = body.completed or 0,
        description = body.description,
        folder = body.folder
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _row_to_dict(project)


@router.put("/projects/{project_id}")
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db)):
    """Update an existing project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    # If updating name, check for conflicts
    if body.name and body.name != project.name:
        existing = db.query(Project).filter(
            Project.name == body.name,
            Project.user_id == project.user_id,
            Project.id != project_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"A project named '{body.name}' already exists. Please choose a different name."
            )
        project.name = body.name
    
    if body.dataset_data is not None:
        project.dataset_data = body.dataset_data
    if body.project_state is not None:
        project.project_state = body.project_state
    if body.results_data is not None:
        project.results_data = body.results_data
    if body.instance_count is not None:
        project.instance_count = body.instance_count
    if body.completed is not None:
        project.completed = body.completed
    if body.description is not None:
        project.description = body.description
    if body.folder is not None:
        project.folder = body.folder
    
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return _row_to_dict(project)


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Delete a project by ID."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    db.delete(project)
    db.commit()
    return {"deleted": project_id}


def _row_to_dict(row: Project) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "user_id": row.user_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "dataset_name": row.dataset_name,
        "dataset_data": row.dataset_data,
        "project_state": row.project_state,
        "results_data": row.results_data,
        "instance_count": row.instance_count,
        "completed": row.completed,
        "description": row.description,
        "folder": row.folder,
    }
