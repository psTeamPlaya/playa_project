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
from backend.models.activity_variable_weight import ActivityVariableWeight
from backend.models.beach import Beach
from backend.models.service import Service
from backend.models.user import User
from backend.models.user_audit_log import UserAuditLog
from backend.models.variable import Variable
from backend.schemas.user import UserAuditLogResponse, UserResponse
from backend.user_audit import (
    USER_AUDIT_BAN,
    USER_AUDIT_DELETE,
    USER_AUDIT_UNBAN,
    create_user_audit_log,
)
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
    "buceo": "bucear",
    "bucear": "bucear",
    "snorkel": "bucear",
    "caminar": "caminar",
    "pasear": "caminar",
    "pescar": "pescar",
    "kayak": "kayak",
    "kitesurf": "kitesurf",
    "kite surf": "kitesurf",
    "piscina_natural": "piscina_natural",
    "piscina natural": "piscina_natural",
}

EXCLUDED_ADMIN_ACTIVITIES = {"piscina_natural", "playa_para_mascotas"}


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
    weights: dict[str, float] = Field(default_factory=dict)


class AdminUserBanPayload(BaseModel):
    is_banned: bool


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
    ensure_table_id_sequence(db, "beaches")


def ensure_table_id_sequence(db: Session, table_name: str) -> None:
    bind = getattr(db, "bind", None)
    dialect_name = getattr(getattr(bind, "dialect", None), "name", None)
    if bind is not None and dialect_name != "postgresql":
        return

    db.execute(
        text(
            f"""
            SELECT setval(
                pg_get_serial_sequence('{table_name}', 'id'),
                COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                true
            )
            """
        )
    )


def ensure_activity_id_sequence(db: Session) -> None:
    ensure_table_id_sequence(db, "activities")


def ensure_service_id_sequence(db: Session) -> None:
    ensure_table_id_sequence(db, "services")


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


def serialize_variable_option(variable: Variable) -> dict:
    return {
        "id": variable.id,
        "name": variable.name,
        "label": prettify_catalog_name(variable.name),
        "unit": variable.unit,
    }


def serialize_catalog_item(item: Activity | Service, normalizer) -> dict:
    normalized = normalizer(item.name)
    return {
        "id": item.id,
        "name": normalized,
        "label": prettify_catalog_name(normalized or item.name),
    }


def serialize_admin_activity(
    normalized_name: str,
    db_activity: Activity | None,
    weights: dict[str, float],
) -> dict:
    is_system = normalized_name in PESOS_ACTIVIDAD
    return {
        "id": db_activity.id if db_activity is not None else None,
        "name": normalized_name,
        "label": prettify_catalog_name(normalized_name),
        "weights": weights,
        "is_system": is_system,
        "can_rename": not is_system,
        "can_delete": db_activity is not None and not is_system,
    }


def _list_unique_activities(db: Session) -> list[Activity]:
    seen_names = set()
    unique_activities = []
    for activity in db.query(Activity).order_by(Activity.name.asc()).all():
        normalized = normalize_activity_name(activity.name)
        if not normalized or normalized in seen_names:
            continue
        seen_names.add(normalized)
        unique_activities.append(activity)
    return unique_activities


def _find_activity_by_normalized_name(db: Session, normalized_name: str) -> Activity | None:
    for activity in db.query(Activity).all():
        if normalize_activity_name(activity.name) == normalized_name:
            return activity
    return None


def get_activity_weights_definition(db: Session, normalized_name: str) -> dict[str, float]:
    activity = _find_activity_by_normalized_name(db, normalized_name)
    if activity is None:
        return dict(PESOS_ACTIVIDAD.get(normalized_name, {}))

    weights = {
        variable.name: float(weight.weight)
        for weight, variable in (
            db.query(ActivityVariableWeight, Variable)
            .join(Variable, Variable.id == ActivityVariableWeight.variable_id)
            .filter(ActivityVariableWeight.activity_id == activity.id)
            .all()
        )
        if weight.weight is not None and float(weight.weight) > 0
    }
    return weights or dict(PESOS_ACTIVIDAD.get(normalized_name, {}))


def normalize_activity_weights(raw_weights: dict[str, float], db: Session) -> dict[int, float]:
    if not raw_weights:
        return {}

    variables = {
        variable.name: variable.id
        for variable in db.query(Variable).all()
    }
    unknown_variables = sorted(name for name in raw_weights if name not in variables)
    if unknown_variables:
        raise HTTPException(
            status_code=400,
            detail=f"Variables no válidas: {', '.join(unknown_variables)}",
        )

    normalized_pairs = [
        (variables[name], float(weight))
        for name, weight in raw_weights.items()
        if float(weight) > 0
    ]
    total = sum(weight for _, weight in normalized_pairs)
    if total <= 0:
        return {}

    return {
        variable_id: weight / total
        for variable_id, weight in normalized_pairs
    }


def replace_activity_weights(db: Session, activity_id: int, raw_weights: dict[str, float]) -> None:
    normalized_weights = normalize_activity_weights(raw_weights, db)
    db.query(ActivityVariableWeight).filter(
        ActivityVariableWeight.activity_id == activity_id
    ).delete()

    for variable_id, weight in normalized_weights.items():
        db.add(
            ActivityVariableWeight(
                activity_id=activity_id,
                variable_id=variable_id,
                weight=weight,
            )
        )


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


def replace_activity_name_in_metadata(
    metadata: list[dict],
    previous_name: str,
    new_name: str,
) -> list[dict]:
    updated = []
    for entry in metadata:
        new_entry = dict(entry)
        new_entry["actividades_ideales"] = [
            {
                **item,
                "actividad": new_name if normalize_activity_name(item.get("actividad")) == previous_name else item.get("actividad"),
            }
            for item in entry.get("actividades_ideales", [])
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


@router.get("/users/history", response_model=list[UserAuditLogResponse])
def list_user_audit_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return (
        db.query(UserAuditLog)
        .order_by(UserAuditLog.created_at.desc(), UserAuditLog.id.desc())
        .limit(100)
        .all()
    )


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

    create_user_audit_log(db, USER_AUDIT_DELETE, target_user=user, actor_user=current_user)
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.patch("/users/{user_id}/ban", response_model=UserResponse)
def set_user_ban_status(
    user_id: int,
    payload: AdminUserBanPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes banear tu propio usuario admin")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="No puedes banear otro usuario admin")

    user.is_banned = payload.is_banned
    create_user_audit_log(
        db,
        USER_AUDIT_BAN if payload.is_banned else USER_AUDIT_UNBAN,
        target_user=user,
        actor_user=current_user,
    )
    db.commit()
    db.refresh(user)
    return user


@router.get("/catalog")
def get_catalog(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    activities = [serialize_catalog_option(name) for name in collect_available_activities(db)]
    services = [serialize_catalog_option(name) for name in collect_available_services(db)]
    variables = [
        serialize_variable_option(variable)
        for variable in db.query(Variable).order_by(Variable.name.asc()).all()
    ]
    return {
        "activities": activities,
        "services": services,
        "variables": variables,
        "activity_weight_templates": PESOS_ACTIVIDAD,
    }


@router.get("/activities")
def list_admin_activities(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return [
        serialize_admin_activity(
            normalized_name=activity_name,
            db_activity=_find_activity_by_normalized_name(db, activity_name),
            weights=get_activity_weights_definition(db, activity_name),
        )
        for activity_name in collect_available_activities(db)
    ]


@router.post("/activities")
def create_admin_activity(
    payload: AdminCatalogItemPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    normalized_name = normalize_activity_name(payload.name)
    if not normalized_name or normalized_name in EXCLUDED_ADMIN_ACTIVITIES:
        raise HTTPException(status_code=400, detail="Nombre de actividad no válido")

    existing = _find_activity_by_normalized_name(db, normalized_name)
    if existing is not None:
        raise HTTPException(status_code=400, detail="La actividad ya existe")

    normalized_weights = normalize_activity_weights(payload.weights, db)
    if not normalized_weights and normalized_name not in PESOS_ACTIVIDAD:
        raise HTTPException(
            status_code=400,
            detail="Debes asignar al menos un peso positivo para la nueva actividad",
        )

    ensure_activity_id_sequence(db)
    activity = Activity(name=normalized_name)
    db.add(activity)
    db.flush()
    replace_activity_weights(db, activity.id, payload.weights)
    db.commit()
    db.refresh(activity)
    return serialize_catalog_item(activity, normalize_activity_name)


@router.put("/activities/{activity_name}")
def update_admin_activity(
    activity_name: str,
    payload: AdminCatalogItemPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    current_name = normalize_activity_name(activity_name)
    new_name = normalize_activity_name(payload.name)

    if not current_name:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    if not new_name or new_name in EXCLUDED_ADMIN_ACTIVITIES:
        raise HTTPException(status_code=400, detail="Nombre de actividad no válido")
    if current_name in PESOS_ACTIVIDAD and new_name != current_name:
        raise HTTPException(
            status_code=400,
            detail="Las actividades base solo permiten editar pesos",
        )

    current_activity = _find_activity_by_normalized_name(db, current_name)
    conflicting_activity = _find_activity_by_normalized_name(db, new_name)
    if (
        conflicting_activity is not None
        and current_activity is not None
        and conflicting_activity.id != current_activity.id
    ):
        raise HTTPException(status_code=400, detail="La actividad ya existe")
    if current_activity is None and conflicting_activity is not None:
        raise HTTPException(status_code=400, detail="La actividad ya existe")

    normalized_weights = normalize_activity_weights(payload.weights, db)
    if not normalized_weights and new_name not in PESOS_ACTIVIDAD:
        raise HTTPException(
            status_code=400,
            detail="Debes asignar al menos un peso positivo para la actividad",
        )

    metadata = load_beach_metadata()
    if current_activity is None:
        ensure_activity_id_sequence(db)
        current_activity = Activity(name=new_name)
        db.add(current_activity)
        db.flush()
    else:
        current_activity.name = new_name

    replace_activity_weights(db, current_activity.id, payload.weights)
    if current_name != new_name:
        metadata = replace_activity_name_in_metadata(metadata, current_name, new_name)
        save_beach_metadata(metadata)

    db.commit()
    db.refresh(current_activity)
    return serialize_admin_activity(
        normalized_name=new_name,
        db_activity=current_activity,
        weights=get_activity_weights_definition(db, new_name),
    )


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

    db.query(ActivityVariableWeight).filter(
        ActivityVariableWeight.activity_id == activity.id
    ).delete()
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

    ensure_service_id_sequence(db)
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
