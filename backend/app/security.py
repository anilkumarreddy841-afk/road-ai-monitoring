import os
import hashlib
import base64
import hmac
from jose import jwt, JWTError
from datetime import datetime, timedelta

# JWT / token settings
JWT_SECRET = os.getenv("JWT_SECRET", "change_this")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_EXPIRE = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def _pbkdf2_hash(password: str, salt: bytes = None, iterations: int = 100000) -> str:
    if salt is None:
        salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2${iterations}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def get_password_hash(password: str) -> str:
    return _pbkdf2_hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        parts = hashed.split("$")
        if parts[0] != "pbkdf2":
            return False
        iterations = int(parts[1])
        salt = base64.b64decode(parts[2])
        dk = base64.b64decode(parts[3])
        newdk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(newdk, dk)
    except Exception:
        return False


def create_access_token(subject: str, role: str | None = None, expires_delta: int = ACCESS_EXPIRE) -> str:
    to_encode = {"sub": subject, "exp": datetime.utcnow() + timedelta(minutes=int(expires_delta))}
    if role:
        to_encode["role"] = role
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
