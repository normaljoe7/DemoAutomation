import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from models import User
from database import get_db

SECRET_KEY = os.environ.get("SECRET_KEY", "super_secret_key_for_dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# AUTH_DISABLED=true bypasses all token checks — set in .env for dev, remove for production
AUTH_DISABLED = os.environ.get("AUTH_DISABLED", "true").lower() == "true"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# auto_error=False so missing token doesn't raise 401 — we handle it below
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _dev_admin(db: Session) -> User:
    """Return the first admin user in the DB, or an in-memory stub if none exists."""
    admin = db.query(User).filter(User.role == "admin").first()
    if admin:
        return admin
    # Fallback stub — not persisted to DB
    stub = User()
    stub.id = 0
    stub.email = "dev@local"
    stub.name = "Dev Admin"
    stub.role = "admin"
    stub.is_active = True
    return stub

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # ── Dev bypass ────────────────────────────────────────────────────────────
    if AUTH_DISABLED or not token:
        return _dev_admin(db)
    # ── Normal JWT validation ─────────────────────────────────────────────────
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(*roles: str):
    """
    Dependency factory that enforces role-based access control.
    Usage: Depends(require_role("team_lead")) or Depends(require_role("finance", "legal"))
    Admins always pass regardless of the required role.
    """
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role != "admin" and current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {' or '.join(roles)}"
            )
        return current_user
    return dependency
