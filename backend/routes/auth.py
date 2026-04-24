from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.user import User
from backend.schemas.user import UserCreate, UserLogin
from backend.auth.auth import get_current_user, hash_password, verify_password, create_token
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
import asyncio

router = APIRouter(prefix="/auth", tags=["AUTH"])

# Configuración de correo
conf = ConnectionConfig(
    MAIL_USERNAME = "midiadeplaya@gmail.com",
    MAIL_PASSWORD = "uexytfxsajksaxkq", # No es tu clave normal
    MAIL_FROM = "midiadeplaya@gmail.com",
    MAIL_PORT = 465,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_STARTTLS = False,
    MAIL_SSL_TLS = True,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

def send_welcome_email(email: str):
    message = MessageSchema(
        subject="¡Bienvenido a Playas App!",
        recipients=[email],
        body=f"Hola {email}, gracias por registrarte. ¡Disfruta de tus actividades!",
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    # Aquí se envía de forma asíncrona
    import asyncio
    asyncio.run(fm.send_message(message))

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user_exist = db.query(User).filter(User.email == user.email).first()
    if db_user_exist:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado.")

    db_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(db_user)
    db.commit()

    background_tasks.add_task(send_welcome_email, user.email)

    return {"msg": "registered"} 


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(db_user.id)
    return {"access_token": token}

@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email
    }

