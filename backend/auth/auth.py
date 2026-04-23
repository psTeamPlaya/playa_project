from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from backend.db import get_db
from backend.models.user import User
from backend.config import settings

pwd_context = CryptContext(schemes=["bcrypt"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)

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