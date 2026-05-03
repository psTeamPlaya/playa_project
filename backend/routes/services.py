from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.service import Service
from backend.schemas.service import ServiceResponse

router = APIRouter(prefix="/services", tags=["Services"])

@router.get("/", response_model=list[ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(Service).all()