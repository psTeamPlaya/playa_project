from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

import backend.models       # NO BORRAR, SE USA AUNQUE PONGA QUE NO
from backend.config import settings
from backend.routes import api_router, views_router, auth_router, users_router 
from backend.engine_recomendation import recomendar_playas
from backend.db import engine
from contextlib import asynccontextmanager
from backend.db import Base

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
# app.include_router(fav_router)

@app.get("/")
def inicio():
    return {"mensaje": "API de recomendación de playas funcionando"}

@app.get("/recomendaciones")
def obtener_recomendaciones(actividad: str, fecha: str, hora: str, limit: int = 3):
    try:
        resultados = recomendar_playas(
            actividad=actividad,
            fecha=fecha,
            hora=hora,
            top_n=None if limit == -1 else limit
        )
        return {
            "actividad": actividad,
            "fecha": fecha,
            "hora": hora,
            "resultados": resultados
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
