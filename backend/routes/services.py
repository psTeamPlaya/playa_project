from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.service import Service
from backend.schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate

router = APIRouter(prefix="/services", tags=["Services"])

def get_service_or_404(db: Session, service_id: int):
    service = db.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

# Create 1 service
@router.post("/", response_model=ServiceResponse)
def create_service(data: ServiceCreate, db: Session = Depends(get_db)):
    # 'name' is unique, so it would crash if it's repeated
    existing = db.query(Service).filter(Service.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service already exists")
    
    service = Service(name=data.name)
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

# Read ALL services (we will use this in frontend ALWAYS)
@router.get("/", response_model=list[ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(Service).all()

# Read 1 service
@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = get_service_or_404(db, service_id)
    return service

@router.patch("/{service_id}", response_model=ServiceResponse)
def update_service(service_id: int, data: ServiceUpdate, db: Session = Depends(get_db)):
    service = get_service_or_404(db, service_id)
    if data.name is not None:
        existing = db.query(Service).filter(Service.name == data.name).first()
        if existing and existing.id != service_id:
            raise HTTPException(status_code=400, detail="Service already exists")
        service.name = data.name

    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db)):
    service = get_service_or_404(db, service_id)
    
    db.delete(service)
    db.commit()
    return {"message": "Deleted"}