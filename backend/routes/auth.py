from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.user import User
from backend.schemas.user import UserCreate, UserLogin
from backend.auth.auth import get_current_user, hash_password, verify_password, create_token
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["AUTH"])

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

    db_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    asyncio.create_task(send_welcome_email(user.email))

    return {"msg": "registered", "user_id": db_user.id}


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(db_user.id)
    return {"access_token": token}

@router.get("/me")
def me(current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": current_user.id,
        "email": current_user.email
    }
