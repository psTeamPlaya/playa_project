from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.routes.admin import collect_available_activities, serialize_catalog_option
from backend.schemas.activity import ActivityResponse

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("/", response_model=list[ActivityResponse])
def get_activities(db: Session = Depends(get_db)):
    return [serialize_catalog_option(name) for name in collect_available_activities(db)]
