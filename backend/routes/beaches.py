import json
from fastapi import APIRouter, HTTPException
from backend.schemas.beach import Beach
from backend.scorer.main_scorer import score_beach
from backend.scorer.config_scorer import AVAILABLE_ACTIVITIES

FILE_PATH = "backend/beaches.json"
router = APIRouter()


def read_json():
    with open(FILE_PATH, "r") as f:
        return json.load(f)


def write_json(data):
    with open(FILE_PATH, "w") as f:
        json.dump(data, f, indent=2)


def get_criteria(beach: dict, activity: str) -> list[dict]:
    """
    Devuelve la lista de criterios evaluados para la playa y actividad seleccionada.
    Se indica si se cumple o no cada criterio(matched) y el frontend
    resalta por qué condiciones se recomendó.
    """
    d = beach["dynamic"]

    criteria_map = {
        "sunbathing": [
            {"icon": "🌡️", "label": "Temperatura ambiente agradable", "value": f"{d['airTemperature']}°C",
             "matched": d["airTemperature"] >= 20},
            {"icon": "🌊", "label": "Temperatura del mar confortable", "value": f"{d['seaTemperature']}°C",
             "matched": d["seaTemperature"] >= 18},
            {"icon": "💨", "label": "Viento moderado", "value": f"{d['wind']} km/h", "matched": d["wind"] <= 20},
            {"icon": "☀️", "label": "Poca nubosidad", "value": f"{round(d['cloudiness'] * 100)}%",
             "matched": d["cloudiness"] < 0.4},
            {"icon": "🌧️", "label": "Sin riesgo de lluvia", "value": f"{round(d['rainProbability'] * 100)}%",
             "matched": d["rainProbability"] < 0.2},
            {"icon": "😎", "label": "Radiación UV suficiente", "value": f"índice {d['uvRadiation']}",
             "matched": d["uvRadiation"] >= 3},
        ],
        "surf": [
            {"icon": "🌊", "label": "Altura de oleaje ideal", "value": f"{d['waves']['height']}m",
             "matched": 0.8 <= d["waves"]["height"] <= 2.5},
            {"icon": "⏱️", "label": "Período de ola suficiente", "value": f"{d['waves']['period']}s",
             "matched": d["waves"]["period"] >= 7},
            {"icon": "💨", "label": "Viento offshore/onshore", "value": f"{d['wind']} km/h",
             "matched": 10 <= d["wind"] <= 25},
            {"icon": "🌡️", "label": "Temperatura ambiente ok", "value": f"{d['airTemperature']}°C",
             "matched": d["airTemperature"] >= 18},
            {"icon": "🏄", "label": "Ola no excesiva", "value": f"{d['waves']['height']}m",
             "matched": d["waves"]["height"] <= 3.5},
        ],
        "windsurf": [
            {"icon": "💨", "label": "Viento ideal para navegar", "value": f"{d['wind']} km/h",
             "matched": 15 <= d["wind"] <= 30},
            {"icon": "🌊", "label": "Oleaje manejable", "value": f"{d['waves']['height']}m",
             "matched": d["waves"]["height"] <= 1.5},
            {"icon": "🌧️", "label": "Sin lluvia intensa", "value": f"{d['rain']}mm", "matched": d["rain"] <= 0.1},
            {"icon": "🌡️", "label": "Temperatura ambiente ok", "value": f"{d['airTemperature']}°C",
             "matched": d["airTemperature"] >= 18},
        ],
        "paddle_surf": [
            {"icon": "🌊", "label": "Mar en calma", "value": f"{d['waves']['height']}m",
             "matched": d["waves"]["height"] <= 0.8},
            {"icon": "💨", "label": "Viento suave", "value": f"{d['wind']} km/h", "matched": d["wind"] <= 15},
            {"icon": "🌡️", "label": "Temperatura agradable", "value": f"{d['airTemperature']}°C",
             "matched": d["airTemperature"] >= 20},
            {"icon": "⏱️", "label": "Período de ola aceptable", "value": f"{d['waves']['period']}s",
             "matched": d["waves"]["period"] >= 4},
        ],
        "kayak": [
            {"icon": "🌊", "label": "Mar en calma", "value": f"{d['waves']['height']}m",
             "matched": d["waves"]["height"] <= 0.8},
            {"icon": "💨", "label": "Viento moderado", "value": f"{d['wind']} km/h", "matched": d["wind"] <= 15},
            {"icon": "🌡️", "label": "Temperatura agradable", "value": f"{d['airTemperature']}°C",
             "matched": d["airTemperature"] >= 18},
            {"icon": "⏱️", "label": "Período de ola aceptable", "value": f"{d['waves']['period']}s",
             "matched": d["waves"]["period"] >= 4},
        ],
        "family": [
            {"icon": "🌊", "label": "Oleaje seguro para niños", "value": f"{d['waves']['height']}m",
             "matched": d["waves"]["height"] <= 0.8},
            {"icon": "🌡️", "label": "Temperatura ambiente cálida", "value": f"{d['airTemperature']}°C",
             "matched": d["airTemperature"] >= 22},
            {"icon": "🌊", "label": "Agua templada", "value": f"{d['seaTemperature']}°C",
             "matched": d["seaTemperature"] >= 19},
            {"icon": "💨", "label": "Viento suave", "value": f"{d['wind']} km/h", "matched": d["wind"] <= 20},
            {"icon": "🌧️", "label": "Sin lluvia", "value": f"{d['rain']}mm", "matched": d["rain"] == 0},
            {"icon": "☀️", "label": "Poca nubosidad", "value": f"{round(d['cloudiness'] * 100)}%",
             "matched": d["cloudiness"] < 0.5},
        ],
    }
    return criteria_map.get(activity, [])


@router.get("/", summary="Get all beaches")
def get_beaches():
    return read_json()["data"]


@router.get("/{beach_id}", summary="Get 1 beach")
def get_beach(beach_id: int):
    db = read_json()
    for beach in db["data"]:
        if beach["static"]["id"] == beach_id:
            return beach
    raise HTTPException(status_code=404, detail="Beach not found")


@router.get("/{beach_id}/detail", summary="HU-07: Ficha detallada de playa con criterios")
def get_beach_detail(beach_id: int, activity: str = "sunbathing"):
    """
    Devuelve la ficha completa de una playa cierta actividad ,con la puntuación y
    los criterios resaltados por los q la se recomendó. Implementa HU-07.
    """
    if activity not in AVAILABLE_ACTIVITIES:
        raise HTTPException(
            status_code=400,
            detail=f"Actividad no válida. Opciones: {AVAILABLE_ACTIVITIES}"
        )

    db = read_json()
    beach = next((b for b in db["data"] if b["static"]["id"] == beach_id), None)
    if not beach:
        raise HTTPException(status_code=404, detail="Beach not found")

    score = score_beach(beach, activity)
    criteria = get_criteria(beach, activity)

    matched = [c for c in criteria if c["matched"]]
    unmatched = [c for c in criteria if not c["matched"]]

    return {
        "beach": beach,
        "activity": activity,
        "score": score,
        "excluded": score == -1,
        "criteria": {
            "matched": matched,
            "unmatched": unmatched,
            "all": criteria,
        }
    }


@router.post("/", summary="Post 1 beach")
def add_beach(beach: Beach):
    database = read_json()
    # No añadir si se llaman igual y están en las mismas coordenadas
    for b in database["data"]:
        same_name = b["static"]["name"].lower() == beach.static.name.lower()
        same_location = (
                round(b["static"]["coordinates"]["latitude"], 3) ==
                round(beach.static.coordinates.latitude, 3)
                and
                round(b["static"]["coordinates"]["longitude"], 3) ==
                round(beach.static.coordinates.longitude, 3)
        )
        if same_name and same_location:
            raise HTTPException(
                status_code=409,
                detail="La playa ya existe (mismo nombre y ubicación)"
            )
    database["data"].append(beach.model_dump())
    write_json(database)

    return {
        "message": "Playa guardada",
        "total": len(database["data"])
    }