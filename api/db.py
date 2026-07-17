"""
SQLite-backed run history store via SQLAlchemy.
Uses SQLite so there's zero server setup — file is created automatically.
Can be swapped to PostgreSQL by changing DATABASE_URL.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./ml_hub_history.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite needs this for multi-thread
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class RunHistory(Base):
    __tablename__ = "run_history"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at    = Column(DateTime, default=datetime.utcnow)
    modality      = Column(String, nullable=True)
    model_name    = Column(String, nullable=False)
    dataset_name  = Column(String, nullable=True)
    target_column = Column(String, nullable=True)
    feature_count = Column(Integer, nullable=True)
    metrics       = Column(JSON, nullable=True)
    config        = Column(JSON, nullable=True)
    user_id       = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    model_artifact = Column(JSON, nullable=True)
    seasonal_vector = Column(JSON, nullable=True)
    scale_factor  = Column(JSON, nullable=True)


class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username      = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name          = Column(String, nullable=False, index=True)
    user_id       = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Dataset reference
    dataset_name  = Column(String, nullable=False)
    dataset_data  = Column(JSON, nullable=True)  # Full dataset or reference
    
    # Complete project state
    project_state = Column(JSON, nullable=True)  # All instances, configurations, settings
    
    # Results data
    results_data  = Column(JSON, nullable=True)  # Final results for View Results
    
    # Metadata
    instance_count = Column(Integer, nullable=False, default=0)
    completed     = Column(Integer, nullable=False, default=0)  # 0 = in-progress, 1 = completed
    description   = Column(String, nullable=True)
    folder        = Column(String, nullable=True)


def create_tables():
    """Called at app startup to ensure tables exist."""
    Base.metadata.create_all(bind=engine)
    
    # Run migrations for description and folder columns
    from sqlalchemy import text
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN description TEXT;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN folder TEXT;"))
        except Exception:
            pass


def get_db():
    """Dependency: yield a SQLAlchemy session, close when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
