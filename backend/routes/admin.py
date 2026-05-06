import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from backend.auth.auth import require_admin
from backend.db import get_db
from backend.models.activity import Activity
from backend.models.beach import Beach
from backend.models.service import Service
from backend.models.user import User
from backend.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin"])

PLAYAS_FILE = Path(__file__).resolve().parents[1] / "playas.json"


class AdminBeachPayload(BaseModel):
    name: str
    location: str | None = None
    description: str | None = None
    type: str | None = None
    latitude: float
    longitude: float
    accessibility: str | None = None
    image: str | None = None
    service_names: list[str] = Field(default_factory=list)
    activity_names: list[str] = Field(default_factory=list)


def load_beach_metadata() -> list[dict]:
    if not PLAYAS_FILE.exists():
        return []

    with PLAYAS_FILE.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def save_beach_metadata(beaches: list[dict]) -> None:
    beaches.sort(key=lambda item: item["id"])
    with PLAYAS_FILE.open("w", encoding="utf-8") as fh:
        json.dump(beaches, fh, ensure_ascii=False, indent=2)


def serialize_beach(beach: Beach, metadata: dict | None = None) -> dict:
    metadata = metadata or {}
    activities = metadata.get("actividades_ideales", [])
    services_map = metadata.get("servicios", {}).copy()

    for service in beach.services or []:
        services_map[service.name] = True

    return {
        "id": beach.id,
        "name": beach.name,
        "location": beach.location,
        "description": beach.description,
        "type": beach.type,
        "latitude": float(beach.latitude),
        "longitude": float(beach.longitude),
        "accessibility": beach.accessibility,
        "image": beach.image,
        "activities": [item.get("actividad") for item in activities if item.get("actividad")],
        "services": sorted([name for name, enabled in services_map.items() if enabled]),
    }


def update_metadata_entry(existing: dict | None, beach: Beach, payload: AdminBeachPayload) -> dict:
    existing = existing or {"id": beach.id}
    previous_services = existing.get("servicios", {}).copy()
    previous_activities = {
        item.get("actividad"): item.get("condicion", "gestionado desde panel admin")
        for item in existing.get("actividades_ideales", [])
        if item.get("actividad")
    }

    for service_name in payload.service_names:
        previous_services[service_name] = True

    for service_name in list(previous_services.keys()):
        if service_name in payload.service_names:
            previous_services[service_name] = True
        elif service_name in {"restaurantes", "comida_para_llevar", "balneario", "zona_deportiva", "pet_friendly"}:
            previous_services[service_name] = False

    return {
        "id": beach.id,
        "nombre": payload.name,
        "ubicacion": payload.location,
        "latitud": payload.latitude,
        "longitud": payload.longitude,
        "tipo": payload.type,
        "descripcion": payload.description,
        "actividades_ideales": [
            {
                "actividad": activity_name,
                "condicion": previous_activities.get(activity_name, "gestionado desde panel admin"),
            }
            for activity_name in payload.activity_names
        ],
        "servicios": previous_services,
        "imagen": payload.image,
        "accesibilidad": payload.accessibility,
    }


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).order_by(User.is_admin.desc(), User.email.asc()).all()


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario admin")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="No puedes eliminar otro usuario admin")

    db.delete(user)
    db.commit()
    return {"ok": True}


@router.get("/catalog")
def get_catalog(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    activities = [activity.name for activity in db.query(Activity).order_by(Activity.name.asc()).all()]
    services = [service.name for service in db.query(Service).order_by(Service.name.asc()).all()]
    return {
        "activities": activities,
        "services": services,
    }


@router.get("/beaches")
def list_beaches(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    metadata_by_id = {item["id"]: item for item in load_beach_metadata()}
    beaches = (
        db.query(Beach)
        .options(selectinload(Beach.services))
        .order_by(Beach.name.asc())
        .all()
    )
    return [serialize_beach(beach, metadata_by_id.get(beach.id)) for beach in beaches]


def persist_beach(
    payload: AdminBeachPayload,
    db: Session,
    beach: Beach | None = None,
) -> dict:
    metadata = load_beach_metadata()
    metadata_by_id = {item["id"]: item for item in metadata}

    if beach is None:
        beach = Beach()
        db.add(beach)

    beach.name = payload.name
    beach.location = payload.location
    beach.description = payload.description
    beach.type = payload.type
    beach.latitude = payload.latitude
    beach.longitude = payload.longitude
    beach.accessibility = payload.accessibility
    beach.image = payload.image
    beach.services = (
        db.query(Service)
        .filter(Service.name.in_(payload.service_names))
        .order_by(Service.name.asc())
        .all()
        if payload.service_names
        else []
    )

    db.commit()
    db.refresh(beach)

    updated_entry = update_metadata_entry(metadata_by_id.get(beach.id), beach, payload)
    metadata_by_id[beach.id] = updated_entry
    save_beach_metadata(list(metadata_by_id.values()))

    db.refresh(beach)
    return serialize_beach(beach, updated_entry)


@router.post("/beaches")
def create_beach(
    payload: AdminBeachPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return persist_beach(payload, db)


@router.put("/beaches/{beach_id}")
def update_beach(
    beach_id: int,
    payload: AdminBeachPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    beach = db.query(Beach).options(selectinload(Beach.services)).filter(Beach.id == beach_id).first()
    if beach is None:
        raise HTTPException(status_code=404, detail="Beach not found")

    return persist_beach(payload, db, beach=beach)
