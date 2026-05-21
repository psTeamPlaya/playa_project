import json
from pathlib import Path
import unicodedata

from sqlalchemy.orm import Session

from backend.engine_recomendation import PESOS_ACTIVIDAD
from backend.models.activity import Activity
from backend.models.service import Service


PLAYAS_FILE = Path(__file__).resolve().parent / "playas.json"

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


def prettify_catalog_name(name: str) -> str:
    return name.replace("_", " ").strip().capitalize()


def load_beach_metadata() -> list[dict]:
    if not PLAYAS_FILE.exists():
        return []

    with PLAYAS_FILE.open("r", encoding="utf-8") as fh:
        return json.load(fh)


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
