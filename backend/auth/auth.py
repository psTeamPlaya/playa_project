import base64
import hashlib
import bcrypt

from jose import JWTError, jwt
from fastapi import Depends, Request
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordBearer
from backend.db import get_db
from backend.models.user import User
from backend.config import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
from dotenv import load_dotenv

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

_BCRYPT_SHA256_PREFIX = "bcrypt_sha256$"

load_dotenv()

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
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    user_id = int(payload["sub"])
    return db.query(User).get(user_id)

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

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


def verify_google_token(credential: str, db) -> dict:
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        print(f"DEBUG client_id usado: '{client_id}'")

        id_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
        )

        email = id_info.get("email")
        # 1. Buscar si el usuario ya existe
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # 2. Si no existe, crear uno nuevo sin contraseña (o con una aleatoria)
            user = User(email=email, hashed_password="google_auth_user", is_admin=False)
            db.add(user)
            db.commit()
            db.refresh(user)

        # 3. Generar token de nuestra app para el usuario (sea nuevo o viejo)
        access_token = create_token(user.id)
        return {"access_token": access_token}

    except Exception as e:
        print(f"Error real de Google: {type(e).__name__}: {e}") # Mira esto en tu terminal
        raise HTTPException(status_code=401, detail="Token de Google inválido")