from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.routes import api_router, views_router, auth_router, users_router 
from backend.engine_recomendation import recomendar_playas
from backend.db import engine, Base
import backend.models
from backend.routes import auth_router
from fastapi.responses import FileResponse

Base.metadata.create_all(bind=engine)

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


@app.get("/login")
def serve_login():
    ruta_login = BASE_DIR / "frontend" / "templates" / "login.html"
    return FileResponse(ruta_login)

@app.get("/")
def inicio():
    ruta_index = BASE_DIR / "frontend" / "templates" / "index.html"
    return FileResponse(ruta_index)