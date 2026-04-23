from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models.user_favorite_beaches import UserFavoriteBeaches as FavoriteBeaches
from backend.auth.auth import get_current_user, is_logged_in
from backend.models.user import User

router = APIRouter(prefix="/api/favorites", tags=["Favorites"])


@router.post("/{beach_id}")
def add_favorite(
    beach_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if (not is_logged_in):
        print("User not logged in")
        return {"message": "not logged in"}

    # prevent duplicates
    existing = db.query(FavoriteBeaches).filter_by(
        user_id=user.id,
        beach_id=beach_id
    ).first()

    if existing:
        return {"message": "already favorite"}

    fav = FavoriteBeaches(
        user_id=user.id,
        beach_id=beach_id
    )

    db.add(fav)
    db.commit()

    return {"message": "added to favorites"}

@router.get("")
def list_favorites(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if (not is_logged_in):
        return {"message": "not logged in"}
    favorites = db.query(FavoriteBeaches).filter_by(user_id=user.id).all()
    if not favorites:
        return {"message": "no favorites found"}
    return [{"beach_id": fav.beach_id} for fav in favorites]