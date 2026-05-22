from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.routes.admin import (
    _find_activity_by_normalized_name,
    collect_available_activities,
    serialize_activity_option,
)
from backend.schemas.activity import ActivityResponse

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("/", response_model=list[ActivityResponse])
def get_activities(db: Session = Depends(get_db)):
    return [
        serialize_activity_option(name, _find_activity_by_normalized_name(db, name))
        for name in collect_available_activities(db)
    ]
