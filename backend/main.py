from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.routes.api import router as api_router
from backend.routes.views import router as views_router
from backend.engine_recomendation import recomendar_playas

app = FastAPI(title=settings.APP_NAME)

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(api_router)
app.include_router(views_router)

@app.get("/")
def inicio():
    return {"mensaje": "API de recomendación de playas funcionando"}

@app.get("/recomendaciones")
def obtener_recomendaciones(actividad: str, fecha: str, hora: str):
    try:
        resultados = recomendar_playas(
            actividad=actividad,
            fecha=fecha,
            hora=hora,
            top_n=3
        )
        return {
            "actividad": actividad,
            "fecha": fecha,
            "hora": hora,
            "resultados": resultados
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

