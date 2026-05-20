from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from backend.auth.auth import get_current_user
from backend.db import get_db
import os


from backend.db import get_db
from backend.models.user import User
from backend.schemas.user import UserCreate
from backend.auth.auth import hash_password

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(
        email=user.email,
        hashed_password=hash_password(user.password),
        is_admin=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "email": new_user.email,
        "is_admin": new_user.is_admin,
        "is_banned": new_user.is_banned,
    }


@router.get("") 
def list_users(db: Session = Depends(get_db)):
    # TODO: Remove this debug print statement after confirming the correct database connection.
    print(f"Using DATABASE_URL: {os.getenv('DATABASE_URL')}")

    users = db.query(User).all()

    return [
        {
            "id": user.id,
            "email": user.email,
            "is_admin": user.is_admin,
            "is_banned": user.is_banned,
        }
        for user in users
    ]

@router.post("/me/filters")
async def save_filters(filters: dict = Body(...), # <--- Cambia esto
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.filter_preferences = filters
    db.commit()
    return {"status": "success"}

@router.get("/me/filters")
async def get_filters(current_user: User = Depends(get_current_user)):
    return current_user.filter_preferences or {}
