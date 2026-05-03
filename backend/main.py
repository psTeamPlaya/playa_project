from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

import backend.models       # NO BORRAR, SE USA AUNQUE PONGA QUE NO
from backend.config import settings
from backend.routes import (api_router, views_router, auth_router, users_router, 
                            services_router, activities_router, variables_router,  
                            beach_conditions_router)
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

routers = [api_router, views_router, 
           auth_router, users_router, 
           services_router, activities_router,
           variables_router, beach_conditions_router]

for router in routers:
    app.include_router(router)

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
