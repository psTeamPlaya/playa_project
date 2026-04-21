from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.user import User
from backend.schemas.user import UserCreate, UserLogin
from backend.auth.auth import get_current_user, hash_password, verify_password, create_token

router = APIRouter(prefix="/auth", tags=["AUTH"])

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user_exist = db.query(User).filter(User.email == user.email).first()
    if db_user_exist:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado.")

    db_user = User(email=user.email, password_hash=hash_password(user.password))
    db.add(db_user)
    db.commit()
    return {"msg": "registered"}

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(db_user.id)
    return {"access_token": token}

@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email
    }

