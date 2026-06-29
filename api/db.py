"""
SQLite-backed run history store via SQLAlchemy.
Uses SQLite so there's zero server setup — file is created automatically.
Can be swapped to PostgreSQL by changing DATABASE_URL.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, create_engine
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


def create_tables():
    """Called at app startup to ensure tables exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency: yield a SQLAlchemy session, close when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
