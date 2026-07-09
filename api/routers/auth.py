"""Authentication router — handles signup, login, and logout."""
from __future__ import annotations

import time
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from api.db import SessionLocal, User

router = APIRouter()

# ── In-memory session store ──────────────────────────────────────────────────
auth_sessions: dict = {}  # session_token → {user_id, username, last_activity}


# ── Pydantic models ──────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# ── Session helpers ───────────────────────────────────────────────────────────
def create_session(user_id: str, username: str) -> str:
    """Create a new session token for a user."""
    import secrets
    token = secrets.token_hex(32)
    auth_sessions[token] = {
        "user_id": user_id,
        "username": username,
        "last_activity": time.time()
    }
    return token


def get_session_user(token: Optional[str]) -> Optional[dict]:
    """Validate session token and return user data if valid."""
    if not token or token not in auth_sessions:
        return None
    session = auth_sessions[token]
    # Check if expired (24h = 86400 seconds)
    if time.time() - session["last_activity"] > 86400:
        del auth_sessions[token]
        return None
    # Update activity
    session["last_activity"] = time.time()
    return session


# ── Dependencies ─────────────────────────────────────────────────────────────
async def get_current_user(x_session_id: Annotated[Optional[str], Header(alias="X-Session-ID")] = None):
    """Dependency to get current user from session token."""
    session = get_session_user(x_session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return session


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/signup", response_model=AuthResponse)
async def auth_signup(request: SignupRequest):
    """Register a new user and create a session."""
    from werkzeug.security import generate_password_hash
    
    if not request.username or not request.password:
        raise HTTPException(status_code=400, detail="Username and password are required.")
    
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == request.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists.")
        
        password_hash = generate_password_hash(request.password, method='pbkdf2:sha256')
        new_user = User(username=request.username, password_hash=password_hash)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        token = create_session(new_user.id, new_user.username)
        return AuthResponse(
            token=token,
            user=UserResponse(id=new_user.id, username=new_user.username)
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error.")
    finally:
        db.close()


@router.post("/login", response_model=AuthResponse)
async def auth_login(request: LoginRequest):
    """Authenticate a user and create a session."""
    from werkzeug.security import check_password_hash
    
    if not request.username or not request.password:
        raise HTTPException(status_code=400, detail="Username and password are required.")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == request.username).first()
        if not user or not check_password_hash(user.password_hash, request.password):
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        
        token = create_session(user.id, user.username)
        return AuthResponse(
            token=token,
            user=UserResponse(id=user.id, username=user.username)
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error.")
    finally:
        db.close()


@router.post("/logout")
async def auth_logout(x_session_id: Annotated[Optional[str], Header(alias="X-Session-ID")] = None):
    """Logout a user by deleting their session."""
    if x_session_id and x_session_id in auth_sessions:
        del auth_sessions[x_session_id]
    return {"success": True}
