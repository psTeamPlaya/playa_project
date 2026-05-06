from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.favs import getFavouriteBeaches
from backend.models.user_favorite_beaches import UserFavoriteBeaches as FavoriteBeaches
from backend.auth.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/api/favorites", tags=["Favorites"])

@router.post("/{beach_id}")
def add_favorite(
    beach_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # prevent duplicates
    existing = db.query(FavoriteBeaches).filter_by(user_id=user.id,beach_id=beach_id).first()
    if existing:
        return {"message": "already favorite"}
    
    fav = FavoriteBeaches(user_id=user.id, beach_id=beach_id)
    db.add(fav)
    db.commit()
    return {"message": "added to favorites"}

@router.get("/ids")
def list_favorites_ids(db: Session = Depends(get_db),user: User = Depends(get_current_user)):
    favorites = db.query(FavoriteBeaches).filter_by(user_id=user.id).all()
    return [{"beach_id": fav.beach_id} for fav in favorites]


@router.get("", response_model=dict)
def list_favorites(fecha: str = None, hora: str = None, db: Session = Depends(get_db),user: User = Depends(get_current_user)):
    favorites = db.query(FavoriteBeaches).filter_by(user_id=user.id).all()
    ids = [fav.beach_id for fav in favorites]
    results = getFavouriteBeaches(ids, fecha, hora)
    return {
        "fecha": fecha,
        "hora": hora,
        "resultados": results
    }


@router.delete("/{beach_id}")
def remove_favorite( beach_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    fav = db.query(FavoriteBeaches).filter_by(user_id=user.id, beach_id=beach_id).first()
    if not fav:
        return {"message": "favorite not found"}

    db.delete(fav)
    db.commit()
    return {"message": "removed from favorites"}

