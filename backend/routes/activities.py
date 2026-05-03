from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models.activity import Activity
from backend.schemas.activity import ActivityResponse

router = APIRouter(prefix="/activities", tags=["Activities"])

@router.get("/", response_model=list[ActivityResponse])
def get_activities(db: Session = Depends(get_db)):
    return db.query(Activity).all()
