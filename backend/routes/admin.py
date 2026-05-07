import json
from pathlib import Path
import unicodedata

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session, selectinload

from backend.auth.auth import require_admin
from backend.db import get_db
from backend.models.activity import Activity
from backend.models.beach import Beach
from backend.models.service import Service
from backend.models.user import User
from backend.schemas.user import UserResponse
from backend.engine_recomendation import PESOS_ACTIVIDAD

router = APIRouter(prefix="/admin", tags=["Admin"])

PLAYAS_FILE = Path(__file__).resolve().parents[1] / "playas.json"

ACTIVITY_ALIASES = {
    "tomar_sol": "tomar_sol",
    "tomar sol": "tomar_sol",
    "nadar": "nadar",
    "surf": "surf",
    "windsurf": "windsurf",
    "wind surf": "windsurf",
    "bucear": "bucear",
    "caminar": "caminar",
    "pasear": "caminar",
    "pescar": "pescar",
    "kayak": "kayak",
    "kitesurf": "kitesurf",
    "kite surf": "kitesurf",
    "piscina_natural": "piscina_natural",
    "piscina natural": "piscina_natural",
}

EXCLUDED_ADMIN_ACTIVITIES = {"piscina_natural"}


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


class AdminCatalogItemPayload(BaseModel):
    name: str = Field(min_length=1)


def normalize_activity_name(name: str | None) -> str | None:
    if not name:
        return None

    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.strip().lower().replace("-", " ").replace("_", " ")
    normalized = " ".join(normalized.split())

    return ACTIVITY_ALIASES.get(normalized, normalized.replace(" ", "_"))


def normalize_service_name(name: str | None) -> str | None:
    if not name:
        return None

    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.strip().lower().replace("-", " ").replace("_", " ")
    normalized = " ".join(normalized.split())

    aliases = {
        "balneario": "balnearios",
        "balnearios": "balnearios",
        "pet friendly": "pet_friendly",
    }
    return aliases.get(normalized, normalized.replace(" ", "_"))


def normalize_beach_type(beach_type: str | None) -> str | None:
    if not beach_type:
        return beach_type

    normalized = str(beach_type).strip().lower().replace(" ", "_")
    if normalized == "roca":
        return "piscina_natural"
    return normalized


def prettify_catalog_name(name: str) -> str:
    return name.replace("_", " ").strip().capitalize()


def collect_available_activities(db: Session) -> list[str]:
    activities = set(PESOS_ACTIVIDAD.keys())
    activities.update(
        normalize_activity_name(activity.name)
        for activity in db.query(Activity).order_by(Activity.name.asc()).all()
        if normalize_activity_name(activity.name)
    )

    for metadata in load_beach_metadata():
        for activity in metadata.get("actividades_ideales", []):
            normalized = normalize_activity_name(activity.get("actividad"))
            if normalized:
                activities.add(normalized)

    return sorted(activity for activity in activities if activity not in EXCLUDED_ADMIN_ACTIVITIES)


def collect_available_services(db: Session) -> list[str]:
    services = set(
        normalized
        for service in db.query(Service).order_by(Service.name.asc()).all()
        for normalized in [normalize_service_name(service.name)]
        if normalized
    )

    for metadata in load_beach_metadata():
        for service_name, enabled in metadata.get("servicios", {}).items():
            normalized = normalize_service_name(service_name)
            if normalized and enabled is not None:
                services.add(normalized)

    return sorted(services)


def load_beach_metadata() -> list[dict]:
    if not PLAYAS_FILE.exists():
        return []

    with PLAYAS_FILE.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def save_beach_metadata(beaches: list[dict]) -> None:
    beaches.sort(key=lambda item: item["id"])
    with PLAYAS_FILE.open("w", encoding="utf-8") as fh:
        json.dump(beaches, fh, ensure_ascii=False, indent=2)


def ensure_beach_id_sequence(db: Session) -> None:
    db.execute(
        text(
            """
            SELECT setval(
                pg_get_serial_sequence('beaches', 'id'),
                COALESCE((SELECT MAX(id) FROM beaches), 1),
                true
            )
            """
        )
    )


def serialize_beach(beach: Beach, metadata: dict | None = None) -> dict:
    metadata = metadata or {}
    activities = metadata.get("actividades_ideales", [])
    services_map = {
        normalized: bool(enabled)
        for service_name, enabled in metadata.get("servicios", {}).items()
        for normalized in [normalize_service_name(service_name)]
        if normalized
    }

    for service in beach.services or []:
        normalized = normalize_service_name(service.name)
        if normalized:
            services_map[normalized] = True

    return {
        "id": beach.id,
        "name": beach.name,
        "location": beach.location,
        "description": beach.description,
        "type": normalize_beach_type(beach.type),
        "latitude": float(beach.latitude),
        "longitude": float(beach.longitude),
        "accessibility": beach.accessibility,
        "image": beach.image,
        "activities": [
            normalized
            for item in activities
            for normalized in [normalize_activity_name(item.get("actividad"))]
            if normalized and normalized not in EXCLUDED_ADMIN_ACTIVITIES
        ],
        "services": sorted([name for name, enabled in services_map.items() if enabled]),
    }


def update_metadata_entry(existing: dict | None, beach: Beach, payload: AdminBeachPayload) -> dict:
    existing = existing or {"id": beach.id}
    previous_services = {
        normalized: bool(enabled)
        for service_name, enabled in existing.get("servicios", {}).items()
        for normalized in [normalize_service_name(service_name)]
        if normalized
    }
    previous_activities = {
        normalized: item.get("condicion", "gestionado desde panel admin")
        for item in existing.get("actividades_ideales", [])
        for normalized in [normalize_activity_name(item.get("actividad"))]
        if normalized
    }
    normalized_activity_names = [
        normalized
        for activity_name in payload.activity_names
        for normalized in [normalize_activity_name(activity_name)]
        if normalized and normalized not in EXCLUDED_ADMIN_ACTIVITIES
    ]
    normalized_service_names = [
        normalized
        for service_name in payload.service_names
        for normalized in [normalize_service_name(service_name)]
        if normalized
    ]

    for service_name in normalized_service_names:
        previous_services[service_name] = True

    for service_name in list(previous_services.keys()):
        if service_name in normalized_service_names:
            previous_services[service_name] = True
        elif service_name in {"restaurantes", "comida_para_llevar", "balnearios", "zona_deportiva", "pet_friendly"}:
            previous_services[service_name] = False

    return {
        "id": beach.id,
        "nombre": payload.name,
        "ubicacion": payload.location,
        "latitud": payload.latitude,
        "longitud": payload.longitude,
        "tipo": normalize_beach_type(payload.type),
        "descripcion": payload.description,
        "actividades_ideales": [
            {
                "actividad": activity_name,
                "condicion": previous_activities.get(activity_name, "gestionado desde panel admin"),
            }
            for activity_name in normalized_activity_names
        ],
        "servicios": previous_services,
        "imagen": payload.image,
        "accesibilidad": payload.accessibility,
    }


def serialize_catalog_option(name: str) -> dict:
    return {
        "name": name,
        "label": prettify_catalog_name(name),
    }


def serialize_catalog_item(item: Activity | Service, normalizer) -> dict:
    normalized = normalizer(item.name)
    return {
        "id": item.id,
        "name": normalized,
        "label": prettify_catalog_name(normalized or item.name),
    }


def remove_activity_from_metadata(metadata: list[dict], activity_name: str) -> list[dict]:
    updated = []
    for entry in metadata:
        new_entry = dict(entry)
        new_entry["actividades_ideales"] = [
            item
            for item in entry.get("actividades_ideales", [])
            if normalize_activity_name(item.get("actividad")) != activity_name
        ]
        updated.append(new_entry)
    return updated


def remove_service_from_metadata(metadata: list[dict], service_name: str) -> list[dict]:
    updated = []
    for entry in metadata:
        new_entry = dict(entry)
        filtered_services = {
            key: value
            for key, value in entry.get("servicios", {}).items()
            if normalize_service_name(key) != service_name
        }
        new_entry["servicios"] = filtered_services
        updated.append(new_entry)
    return updated


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
    activities = [serialize_catalog_option(name) for name in collect_available_activities(db)]
    services = [serialize_catalog_option(name) for name in collect_available_services(db)]
    return {
        "activities": activities,
        "services": services,
    }


@router.get("/activities")
def list_admin_activities(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    activities = db.query(Activity).order_by(Activity.name.asc()).all()
    return [serialize_catalog_item(activity, normalize_activity_name) for activity in activities]


@router.post("/activities")
def create_admin_activity(
    payload: AdminCatalogItemPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    normalized_name = normalize_activity_name(payload.name)
    if not normalized_name or normalized_name in EXCLUDED_ADMIN_ACTIVITIES:
        raise HTTPException(status_code=400, detail="Nombre de actividad no válido")

    existing = db.query(Activity).filter(Activity.name == normalized_name).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="La actividad ya existe")

    activity = Activity(name=normalized_name)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return serialize_catalog_item(activity, normalize_activity_name)


@router.delete("/activities/{activity_id}")
def delete_admin_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    activity = db.get(Activity, activity_id)
    if activity is None:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    normalized_name = normalize_activity_name(activity.name)
    metadata = remove_activity_from_metadata(load_beach_metadata(), normalized_name or activity.name)
    save_beach_metadata(metadata)

    db.delete(activity)
    db.commit()
    return {"ok": True}


@router.get("/services")
def list_admin_services(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    services = db.query(Service).order_by(Service.name.asc()).all()
    return [serialize_catalog_item(service, normalize_service_name) for service in services]


@router.post("/services")
def create_admin_service(
    payload: AdminCatalogItemPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    normalized_name = normalize_service_name(payload.name)
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Nombre de servicio no válido")

    existing = db.query(Service).filter(Service.name == normalized_name).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="El servicio ya existe")

    service = Service(name=normalized_name)
    db.add(service)
    db.commit()
    db.refresh(service)
    return serialize_catalog_item(service, normalize_service_name)


@router.delete("/services/{service_id}")
def delete_admin_service(
    service_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = db.query(Service).options(selectinload(Service.beaches)).filter(Service.id == service_id).first()
    if service is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    normalized_name = normalize_service_name(service.name)
    service.beaches.clear()
    metadata = remove_service_from_metadata(load_beach_metadata(), normalized_name or service.name)
    save_beach_metadata(metadata)

    db.delete(service)
    db.commit()
    return {"ok": True}


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
        ensure_beach_id_sequence(db)
        beach = Beach()
        db.add(beach)

    beach.name = payload.name
    beach.location = payload.location
    beach.description = payload.description
    beach.type = normalize_beach_type(payload.type)
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
