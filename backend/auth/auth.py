import base64
import hashlib
import bcrypt

from jose import JWTError, jwt
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from backend.db import get_db
from backend.models.user import User
from backend.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

_BCRYPT_SHA256_PREFIX = "bcrypt_sha256$"


def _normalize_password(password: str) -> bytes:
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str):
    normalized = _normalize_password(password)
    hashed = bcrypt.hashpw(normalized, bcrypt.gensalt())
    return f"{_BCRYPT_SHA256_PREFIX}{hashed.decode('utf-8')}"

def verify_password(password: str, hashed: str):
    if hashed.startswith(_BCRYPT_SHA256_PREFIX):
        normalized = _normalize_password(password)
        stored_hash = hashed[len(_BCRYPT_SHA256_PREFIX):].encode("utf-8")
        return bcrypt.checkpw(normalized, stored_hash)

    # Compatibilidad con hashes bcrypt antiguos que ya existan en la base de datos.
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user_id: int):
    return jwt.encode({"sub": str(user_id)}, settings.SECRET_KEY, algorithm="HS256")

def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    print("token: ", token)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    user_id = int(payload["sub"])
    return db.query(User).get(user_id)

def is_logged_in(request: Request) -> bool:
    auth = request.headers.get("Authorization")

    if not auth:
        return False

    try:
        token = auth.replace("Bearer ", "")
        jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return True
    except JWTError:
        return False
