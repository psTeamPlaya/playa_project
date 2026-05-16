from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import inspect, text
from datetime import date, timedelta
from sqlalchemy import func
from time import perf_counter

import backend.models  # NO BORRAR
from backend.config import settings
from backend.routes import (
    api_router, views_router, auth_router, users_router,
    services_router, activities_router, beaches_router, variables_router,
    beach_conditions_router, favourites_router, alerts_router, admin_router,
    reviews_router
)

from backend.engine_recomendation import (
    cargar_condiciones_open_meteo,
    cargar_condiciones_open_meteo_intervalo,
    cargar_condiciones_desde_db,
    cargar_condiciones_desde_db_intervalo,
    cargar_playas,
    generar_horas_intervalo,
    recomendar_playas,
    resolver_intervalo_horario,
)
from backend.db import SessionLocal, engine, Base
from backend.auth.auth import hash_password
from backend.models.user import User
from backend.sunlight_provider import obtener_aviso_luz_solar, SunlightError
from backend.models.beach_condition import BeachCondition
from backend.weather_provider import OpenMeteoError
from backend.alerts_service import process_user_alerts_cycle
import asyncio


def ensure_user_schema() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "is_admin" not in user_columns:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE")
            )
        if "is_banned" not in user_columns:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE")
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
                is_banned=False,
            )
            session.add(admin_user)
        else:
            admin_user.is_admin = True
            admin_user.is_banned = False
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
    alert_worker_task = None

    async def alert_worker_loop():
        await asyncio.sleep(getattr(settings, "ALERTS_INITIAL_DELAY_SECONDS", 2))
        while True:
            try:
                await process_user_alerts_cycle()
            except Exception as exc:
                print(f"Alert worker error: {exc}")
            await asyncio.sleep(getattr(settings, "ALERTS_POLL_SECONDS", 900))

    """
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
    """
    if getattr(settings, "ALERTS_ENABLED", True):
        alert_worker_task = asyncio.create_task(alert_worker_loop())

    try:
        yield
    finally:
        if alert_worker_task is not None:
            alert_worker_task.cancel()
            try:
                await alert_worker_task
            except asyncio.CancelledError:
                pass

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

routers = [
    api_router, views_router, auth_router, users_router, services_router,
    activities_router, beaches_router, variables_router, beach_conditions_router, favourites_router,
    alerts_router, admin_router, reviews_router
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
    hora: str | None = None,
    hora_inicio: str | None = None,
    hora_fin: str | None = None,
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
        hora_inicio_consulta, hora_fin_consulta = resolver_intervalo_horario(
            hora=hora,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
        )
        horas_consideradas = generar_horas_intervalo(hora_inicio_consulta, hora_fin_consulta)
        playas = cargar_playas()
        expected_records = len(playas) * len(horas_consideradas)
        comparativa_consulta = {
            "db": {
                "elapsed_ms": None,
                "available": False,
                "records": 0,
                "expected_records": expected_records,
                "error": None,
            },
            "openmeteo": {
                "elapsed_ms": None,
                "available": False,
                "records": 0,
                "expected_records": expected_records,
                "error": None,
            },
        }

        db_conditions: list[dict] = []
        db_started_at = perf_counter()
        try:
            if hora_inicio_consulta == hora_fin_consulta:
                db_conditions = cargar_condiciones_desde_db(playas, fecha, hora_inicio_consulta)
            else:
                db_conditions = cargar_condiciones_desde_db_intervalo(playas, fecha, hora_inicio_consulta, hora_fin_consulta)
            comparativa_consulta["db"]["available"] = len(db_conditions) == expected_records
            comparativa_consulta["db"]["records"] = len(db_conditions)
        except Exception as exc:
            comparativa_consulta["db"]["error"] = str(exc)
        finally:
            comparativa_consulta["db"]["elapsed_ms"] = round((perf_counter() - db_started_at) * 1000, 2)

        try:
            aviso_sol = obtener_aviso_luz_solar(
                actividad=actividad,
                playas=playas,
                fecha=fecha,
                hora=hora_inicio_consulta,
                timezone=settings.OPEN_METEO_TIMEZONE,
                timeout_seconds=settings.OPEN_METEO_TIMEOUT_SECONDS,
            )
        except SunlightError:
            aviso_sol = None

        if aviso_sol:
            return {
                "actividad": actividad,
                "fecha": fecha,
                "hora": hora_inicio_consulta,
                "hora_inicio": hora_inicio_consulta,
                "hora_fin": hora_fin_consulta,
                "horas_consideradas": horas_consideradas,
                "resultados": [],
                "aviso_sol": aviso_sol,
                "comparativa_consulta": comparativa_consulta,
            }

        openmeteo_conditions: list[dict] = []
        if settings.WEATHER_PROVIDER == "openmeteo":
            openmeteo_started_at = perf_counter()
            try:
                if hora_inicio_consulta == hora_fin_consulta:
                    openmeteo_conditions = cargar_condiciones_open_meteo(playas, fecha, hora_inicio_consulta)
                else:
                    openmeteo_conditions = cargar_condiciones_open_meteo_intervalo(playas, fecha, hora_inicio_consulta, hora_fin_consulta)
                comparativa_consulta["openmeteo"]["available"] = len(openmeteo_conditions) == expected_records
                comparativa_consulta["openmeteo"]["records"] = len(openmeteo_conditions)
            except OpenMeteoError as exc:
                comparativa_consulta["openmeteo"]["error"] = str(exc)
            finally:
                comparativa_consulta["openmeteo"]["elapsed_ms"] = round(
                    (perf_counter() - openmeteo_started_at) * 1000,
                    2,
                )

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
        condiciones_recomendacion = None
        if len(db_conditions) == expected_records:
            condiciones_recomendacion = db_conditions
        elif len(openmeteo_conditions) == expected_records:
            condiciones_recomendacion = openmeteo_conditions

        comparativa_consulta["db"]["used_for_recommendations"] = (
            condiciones_recomendacion is db_conditions and bool(db_conditions)
        )
        comparativa_consulta["openmeteo"]["used_for_recommendations"] = (
            condiciones_recomendacion is openmeteo_conditions and bool(openmeteo_conditions)
        )

        resultados = recomendar_playas(
            actividad=actividad,
            fecha=fecha,
            hora=hora_inicio_consulta,
            lat_usuario=lat,
            lon_usuario=lon,
            radio_km=radio_km,
            top_n=top_n,
            filtros=filtros,
            playas_override=playas,
            condiciones_override=condiciones_recomendacion,
            hora_inicio=hora_inicio_consulta,
            hora_fin=hora_fin_consulta,
        )
        return {
            "actividad": actividad,
            "fecha": fecha,
            "hora": hora_inicio_consulta,
            "hora_inicio": hora_inicio_consulta,
            "hora_fin": hora_fin_consulta,
            "horas_consideradas": horas_consideradas,
            "resultados": resultados,
            "aviso_sol": None,
            "comparativa_consulta": comparativa_consulta,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
