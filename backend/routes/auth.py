from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.user import User
from backend.schemas.user import UserCreate, UserLogin
from backend.auth.auth import get_current_user, hash_password, verify_password, create_token
from backend.user_audit import USER_AUDIT_REGISTER, create_user_audit_log
from backend.auth.auth import get_current_user, hash_password, verify_password, create_token, verify_google_token
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
import os
import asyncio
from backend.notifications import send_welcome_email
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

router = APIRouter(prefix="/auth", tags=["AUTH"])


@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user_exist = db.query(User).filter(User.email == user.email).first()
    if db_user_exist:
        if db_user_exist.hashed_password == "google_auth_user":
            raise HTTPException(status_code=400, detail="Este correo ya está registrado con Google. Inicia sesión con Google.")
        raise HTTPException(status_code=400, detail="Este correo ya est\u00e1 registrado.")

    db_user = User(email=user.email, hashed_password=hash_password(user.password), is_admin=False)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    create_user_audit_log(db, USER_AUDIT_REGISTER, target_user=db_user)
    db.commit()

    asyncio.create_task(send_welcome_email(user.email))

    return {"msg": "registered", "user_id": db_user.id}


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if db_user and db_user.hashed_password == "google_auth_user":
        raise HTTPException(status_code=401, detail="Este correo está registrado con Google. Inicia sesión con Google.")

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if db_user.is_banned:
        raise HTTPException(status_code=403, detail="User is banned")

    token = create_token(db_user.id)
    return {"access_token": token}

@router.get("/me")
def me(current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "is_banned": current_user.is_banned,
    }

@router.post("/google")
def google_login(body: GoogleTokenRequest, db: Session = Depends(get_db)):
    from backend.config import settings
    print(f"DEBUG: El ID de cliente cargado es: {settings.GOOGLE_CLIENT_ID}")

    return verify_google_token(body.credential, db)