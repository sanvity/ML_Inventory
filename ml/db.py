import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./ml_hub_history.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
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

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
