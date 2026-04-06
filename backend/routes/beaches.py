import json
from fastapi import APIRouter, HTTPException
from backend.schemas.beach import Beach

FILE_PATH = "backend/beaches.json"
router = APIRouter()

def read_json():
    with open(FILE_PATH, "r") as f:
        return json.load(f)

def write_json(data):
    with open(FILE_PATH, "w") as f:
        json.dump(data, f, indent=2)

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