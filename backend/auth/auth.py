from passlib.context import CryptContext
from jose import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from backend.db import get_db
from backend.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"])
SECRET = "supersecret"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)

def create_token(user_id: int):
    return jwt.encode({"sub": str(user_id)}, SECRET, algorithm="HS256")

def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    user_id = int(payload["sub"])
    return db.query(User).get(user_id)

