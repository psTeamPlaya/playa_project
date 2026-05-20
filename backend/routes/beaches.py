from fastapi import APIRouter

from backend.engine_recomendation import cargar_playas
from backend.schemas.beach import BeachOptionResponse


router = APIRouter(prefix="/beaches", tags=["Beaches"])


@router.get("/", response_model=list[BeachOptionResponse])
def list_public_beaches():
    beaches = sorted(cargar_playas(), key=lambda beach: str(beach.get("nombre") or "").lower())
    return [
        {
            "id": int(beach["id"]),
            "name": beach["nombre"],
            "location": beach.get("ubicacion"),
            "label": (
                f'{beach["nombre"]} · {beach["ubicacion"]}'
                if beach.get("ubicacion")
                else beach["nombre"]
            ),
        }
        for beach in beaches
    ]
