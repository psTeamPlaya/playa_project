from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import inspect, text
from datetime import date, timedelta
from sqlalchemy import func
import backend.models  # NO BORRAR
from backend.config import settings
from backend.routes import (
    api_router, views_router, auth_router, users_router,
    services_router, activities_router, variables_router,
    beach_conditions_router, favourites_router, admin_router,
    reviews_router
)

from backend.engine_recomendation import recomendar_playas, cargar_playas
from backend.db import SessionLocal, engine, Base
from backend.auth.auth import hash_password
from backend.models.user import User
from backend.sunlight_provider import obtener_aviso_luz_solar, SunlightError
from backend.models.beach_condition import BeachCondition


def ensure_user_schema() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "is_admin" in user_columns:
        return

    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE")
        )


def ensure_admin_user() -> None:
    session = SessionLocal()
    try:
        admin_user = session.query(User).filter(User.email == "admin").first()
        if admin_user is None:
            admin_user = User(
                email="admin",
                hashed_password=hash_password("admin"),
                is_admin=True,
            )
            session.add(admin_user)
        else:
            admin_user.is_admin = True
            admin_user.hashed_password = hash_password("admin")

        session.commit()
    finally:
        session.close()

from backend.routes.beach_conditions import upsert_beach_conditions

def needs_weather_update(db) -> bool:
    expected_last_day = date.today() + timedelta(days=14)
    latest = db.query(func.max(BeachCondition.datetime)).scalar()
    if latest is None:
        return True

    return latest.date() < expected_last_day        

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_user_schema()
    ensure_admin_user()

    db = SessionLocal()
    try:
        if needs_weather_update(db):
            print("Updating beach conditions...")
            upsert_beach_conditions(db)
            print("Beach conditions updated")
        else:
            print("Beach conditions already up to date.")
    finally:
        db.close()
    yield

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

@app.middleware("http")
async def add_coop_header(request, call_next):
    response = await call_next(request)
    response.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"
    response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
    return response

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

routers = [
    api_router, views_router, auth_router, users_router, services_router,
    activities_router, variables_router, beach_conditions_router, favourites_router,
    admin_router, reviews_router
]

for router in routers: 
    app.include_router(router)

@app.get("/")
def inicio():
    return {"mensaje": "API de recomendación de playas funcionando"}

@app.get("/recomendaciones", response_model=dict)
def obtener_recomendaciones(
    actividad: str,
    fecha: str,
    hora: str,
    lat: float | None = None,
    lon: float | None = None,
    radio_km: int | None = None,
    top_n: int = 3,

    # Filtros
    tipo_arena: bool | None = None,
    tipo_piedra: bool | None = None,
    tipo_piscina_natural: bool | None = None,

    restaurantes: bool | None = None,
    comida_para_llevar: bool | None = None,
    balnearios: bool | None = None,
    zona_deportiva: bool | None = None,
    pet_friendly: bool | None = None,

    min_temperatura_ambiente: float | None = None,
    max_temperatura_ambiente: float | None = None,
    min_nubosidad: float | None = None,
    max_nubosidad: float | None = None,
    min_velocidad_viento: float | None = None,
    max_velocidad_viento: float | None = None,
    min_altura_oleaje: float | None = None,
    max_altura_oleaje: float | None = None,
):
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

        if aviso_sol:
            return {
                "actividad": actividad,
                "fecha": fecha,
                "hora": hora,
                "resultados": [],
                "aviso_sol": aviso_sol,
            }

        filtros = {
            "tipo_arena": tipo_arena,
            "tipo_piedra": tipo_piedra,
            "tipo_piscina_natural": tipo_piscina_natural,

            "restaurantes": restaurantes,
            "comida_para_llevar": comida_para_llevar,
            "balnearios": balnearios,
            "zona_deportiva": zona_deportiva,
            "pet_friendly": pet_friendly,

            "min_temperatura_ambiente": min_temperatura_ambiente,
            "max_temperatura_ambiente": max_temperatura_ambiente,
            "min_nubosidad": min_nubosidad,
            "max_nubosidad": max_nubosidad,
            "min_velocidad_viento": min_velocidad_viento,
            "max_velocidad_viento": max_velocidad_viento,
            "min_altura_oleaje": min_altura_oleaje,
            "max_altura_oleaje": max_altura_oleaje,
        }
        filtros = {k: v for k, v in filtros.items() if v is not None}
        resultados = recomendar_playas(
            actividad=actividad,
            fecha=fecha,
            hora=hora,
            lat_usuario=lat,
            lon_usuario=lon,
            radio_km=radio_km,
            top_n=top_n,
            filtros=filtros
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
