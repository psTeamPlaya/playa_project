from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.routes import api_router, views_router, auth_router, users_router 
from backend.engine_recomendation import cargar_playas, recomendar_playas
from backend.db import engine, Base
from backend.sunlight_provider import SunlightError, obtener_aviso_luz_solar
import backend.models
from backend.routes import auth_router
# from backend.routes.favourites import router as fav_router


Base.metadata.create_all(bind=engine)   # create tables

app = FastAPI(title=settings.APP_NAME)

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(api_router)
app.include_router(views_router)
app.include_router(auth_router)
app.include_router(users_router)
# app.include_router(fav_router)

@app.get("/")
def inicio():
    return {"mensaje": "API de recomendación de playas funcionando"}

@app.get("/recomendaciones")
def obtener_recomendaciones(actividad: str, fecha: str, hora: str):
    try:
        playas = cargar_playas()

        try:
            aviso_sol = obtener_aviso_luz_solar(
                actividad=actividad,
                playas=playas,
                fecha=fecha,
                hora=hora,
                timezone=settings.OPEN_METEO_TIMEZONE,
                timeout_seconds=settings.OPEN_METEO_TIMEOUT_SECONDS,
            )
        except SunlightError:
            aviso_sol = None

        if aviso_sol is not None:
            return {
                "actividad": actividad,
                "fecha": fecha,
                "hora": hora,
                "resultados": [],
                "aviso_sol": aviso_sol,
            }

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
            "resultados": resultados,
            "aviso_sol": None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

