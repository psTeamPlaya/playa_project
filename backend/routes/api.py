from fastapi import APIRouter, Query, HTTPException
import json
import pathlib

from backend.config import settings
from backend.db import check_database_connection
from backend.scorer.main_scorer import score_beach
from backend.scorer.config_scorer import AVAILABLE_ACTIVITIES

router = APIRouter(prefix="/api", tags=["API"])

BEACHES_PATH = pathlib.Path(__file__).resolve().parent.parent / "beaches.json"

@router.get("/health")
def health():
    database_connected = check_database_connection()
    return {
        "status": "ok",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database_connected": database_connected,
    }

@router.get("/playas")
def get_playas(
    actividad: str = Query(..., description=f"Actividad: {AVAILABLE_ACTIVITIES}"),
    limit: int = Query(3, ge=1, description="Número de playas a devolver"),
):
    if actividad not in AVAILABLE_ACTIVITIES:
        raise HTTPException(
            status_code=400,
            detail=f"Actividad '{actividad}' no válida. Opciones: {AVAILABLE_ACTIVITIES}"
        )

    data = json.loads(BEACHES_PATH.read_text())
    playas = data["data"]

    scored = []
    excluidas = []

    for playa in playas:
        score = score_beach(playa, actividad)
        entry = {
            "id":           playa["static"]["id"],
            "name":         playa["static"]["name"],
            "municipality": playa["static"]["municipality"],
            "score":        score,
            "conditions":   playa["dynamic"],
        }
        if score == -1:
            excluidas.append(entry)
        else:
            scored.append(entry)

    scored.sort(key=lambda x: x["score"], reverse=True)

    return {
        "actividad":  actividad,
        "total":      len(scored),
        "mostrando":  min(limit, len(scored)),
        "playas":     scored[:limit],
        "excluidas":  excluidas,
    }