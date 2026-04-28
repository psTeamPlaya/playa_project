from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

import backend.models       # NO BORRAR, SE USA AUNQUE PONGA QUE NO
from backend.config import settings
from backend.engine_recomendation import cargar_playas, recomendar_playas
from backend.db import engine, Base
from backend.sunlight_provider import SunlightError, obtener_aviso_luz_solar
# from backend.routes.favourites import router as fav_router
from backend.routes import api_router, views_router, auth_router, users_router, services_router 
from contextlib import asynccontextmanager

# Crea las tablas al arrancar el servidor
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.include_router(api_router)
app.include_router(views_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(services_router)
# app.include_router(fav_router)

@app.get("/")
def inicio():
    return {"mensaje": "API de recomendación de playas funcionando"}

@app.get("/recomendaciones")
def obtener_recomendaciones(actividad: str, fecha: str, hora: str, lat: float, lon: float, radius: int):
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
            lat_usuario=lat,
            lon_usuario=lon,
            radio_km=radius,
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
