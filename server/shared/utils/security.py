from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from shared.config import get_settings
from typing import Optional

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


# ─────────────────────────────────────────────────────────────
# Symmetric encryption for social tokens & API secrets
# ─────────────────────────────────────────────────────────────
import base64
from cryptography.fernet import Fernet

def _get_fernet() -> Fernet:
    """Derive a Fernet key from JWT_SECRET_KEY (pad/trim to 32 bytes, then base64)."""
    raw = settings.JWT_SECRET_KEY.encode("utf-8")
    key_bytes = (raw * 2)[:32]  # ensure exactly 32 bytes
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext string and return base64 ciphertext."""
    if not plaintext:
        return ""
    f = _get_fernet()
    return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")

def decrypt_token(ciphertext: str) -> str:
    """Decrypt a ciphertext string and return plaintext."""
    if not ciphertext:
        return ""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")

