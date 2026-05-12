from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.user import User
from backend.schemas.user import UserCreate, UserLogin
from backend.auth.auth import get_current_user, hash_password, verify_password, create_token
from backend.user_audit import USER_AUDIT_REGISTER, create_user_audit_log
import os
import asyncio
from dotenv import load_dotenv

try:
    from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
except ModuleNotFoundError:  # pragma: no cover - fallback for local/test environments without mail deps
    FastMail = MessageSchema = ConnectionConfig = MessageType = None

load_dotenv()

router = APIRouter(prefix="/auth", tags=["AUTH"])

conf = None
if ConnectionConfig is not None:
    conf = ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
        MAIL_FROM=os.getenv("MAIL_USERNAME"),
        MAIL_PORT=587,
        MAIL_SERVER="smtp.gmail.com",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )

async def send_welcome_email(email: str):
    if not all([FastMail, MessageSchema, MessageType, conf]):
        return

    message = MessageSchema(
        subject="\u00a1Bienvenido a Playas App!",
        recipients=[email],
        body=f"Hola {email}, gracias por registrarte. \u00a1Disfruta de tus actividades!",
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print(f" Correo enviado a {email}")
    except Exception as e:
        print(f" Error enviando correo: {e}")


@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user_exist = db.query(User).filter(User.email == user.email).first()
    if db_user_exist:
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
