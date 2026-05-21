import math, logging
import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from sqlalchemy import and_
from sqlalchemy.orm import selectinload
from backend.config import settings
from backend.db import SessionLocal
from backend.models.activity import Activity
from backend.models.activity_variable_weight import ActivityVariableWeight
from backend.models.beach import Beach
from backend.models.beach_condition import BeachCondition
from backend.models.variable import Variable
from backend.weather_provider import OpenMeteoError, obtener_condiciones_open_meteo

logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parent
PLAYAS_JSON = BASE_DIR / "playas.json"
CONDICIONES_JSON = BASE_DIR / "condiciones_playas.json"

PESOS_ACTIVIDAD: dict[str, dict[str, float]] = {
    "tomar_sol": {
        "air_temp": 0.30,
        "wind_speed": 0.20,
        "cloud_cover": 0.20,
        "rain_probability": 0.15,
        "wave_height": 0.05,
        "uv_index": 0.10,
    },
    "nadar": {
        "wave_height": 0.30,
        "wind_speed": 0.20,
        "air_temp": 0.15,
        "water_temp": 0.15,
        "rain_probability": 0.10,
    },
    "surf": {
        "wave_height": 0.45,
        "wind_speed": 0.20,
        "air_temp": 0.05,
        "water_temp": 0.05,
        "cloud_cover": 0.05,
        "rain_probability": 0.05,
    },
    "windsurf": {
        "wind_speed": 0.50,
        "wave_height": 0.20,
        "air_temp": 0.05,
        "water_temp": 0.05,
        "cloud_cover": 0.05,
        "rain_probability": 0.05,
    },
    "bucear": {
        "wave_height": 0.30,
        "wind_speed": 0.20,
        "water_temp": 0.20,
        "cloud_cover": 0.05,
        "rain_probability": 0.05,
    },
    "caminar": {
        "air_temp": 0.30,
        "wind_speed": 0.20,
        "cloud_cover": 0.20,
        "rain_probability": 0.20,
        "uv_index": 0.10,
    },
    "pescar": {
        "wave_height": 0.30,
        "wind_speed": 0.25,
        "cloud_cover": 0.10,
        "rain_probability": 0.15,
        "air_temp": 0.10,
        "water_temp": 0.10,
    },
    "kayak": {
        "wave_height": 0.35,
        "wind_speed": 0.25,
        "rain_probability": 0.10,
        "air_temp": 0.10,
        "water_temp": 0.10,
        "cloud_cover": 0.10,
    },
    "kitesurf": {
        "wind_speed": 0.50,
        "wave_height": 0.20,
        "air_temp": 0.10,
        "water_temp": 0.05,
        "cloud_cover": 0.05,
        "rain_probability": 0.10,
    },
    "piscina_natural": {
        "wave_height": 0.35,
        "wind_speed": 0.20,
        "water_temp": 0.20,
        "air_temp": 0.10,
        "rain_probability": 0.10,
        "cloud_cover": 0.05,
    },
}

BONUS_ACTIVIDAD_IDEAL = 2.5
NUMERIC_CONDITION_KEYS = (
    "air_temp",
    "wind_speed",
    "wave_height",
    "water_temp",
    "cloud_cover",
    "rain_probability",
    "uv_index",
    "sea_level_height_msl",
)
FACTOR_LABELS = {
    "air_temp": "temperatura media",
    "wind_speed": "viento medio",
    "wave_height": "oleaje medio",
    "water_temp": "temperatura del agua",
    "cloud_cover": "nubosidad media",
    "rain_probability": "probabilidad media de lluvia",
    "uv_index": "índice UV medio",
}
FACTOR_UNITS = {
    "air_temp": "ºC",
    "wind_speed": "km/h",
    "wave_height": "m",
    "water_temp": "ºC",
    "cloud_cover": "%",
    "rain_probability": "%",
    "uv_index": "",
}
TIDE_EXTREME_THRESHOLD = 0.10
TIDE_TREND_THRESHOLD = 0.05
TIDE_EXTREME_AMPLITUDE = 0.12


def _round_to_nearest_quarter(value: float) -> float:
    return round(float(value) * 4) / 4


def _format_condition_value_for_display(variable: str, value: float) -> str:
    if variable == "wave_height":
        rounded_value = _round_to_nearest_quarter(value)
        return f"{rounded_value:g}"
    return str(round(float(value)))


def _infer_tide_level_label(sea_level_height_msl: float | None) -> str | None:
    if sea_level_height_msl is None:
        return None
    if sea_level_height_msl <= -TIDE_EXTREME_THRESHOLD:
        return "baja"
    if sea_level_height_msl >= TIDE_EXTREME_THRESHOLD:
        return "alta"
    return "media"


def infer_tide_status(condiciones: list[dict[str, Any]]) -> str | None:
    sea_levels = [
        float(condicion["sea_level_height_msl"])
        for condicion in condiciones
        if isinstance(condicion.get("sea_level_height_msl"), (int, float))
    ]

    if not sea_levels:
        return None

    if len(sea_levels) == 1:
        tide_label = _infer_tide_level_label(sea_levels[0])
        if tide_label == "alta":
            return "pleamar"
        if tide_label == "baja":
            return "bajamar"
        return None

    amplitude = max(sea_levels) - min(sea_levels)
    max_index = max(range(len(sea_levels)), key=sea_levels.__getitem__)
    min_index = min(range(len(sea_levels)), key=sea_levels.__getitem__)

    if amplitude >= TIDE_EXTREME_AMPLITUDE:
        if 0 < max_index < len(sea_levels) - 1:
            return "pleamar"
        if 0 < min_index < len(sea_levels) - 1:
            return "bajamar"

    delta = sea_levels[-1] - sea_levels[0]
    if delta >= TIDE_TREND_THRESHOLD:
        return "subiendo"
    if delta <= -TIDE_TREND_THRESHOLD:
        return "bajando"

    tide_label = _infer_tide_level_label(sea_levels[-1])
    if tide_label == "alta":
        return "pleamar"
    if tide_label == "baja":
        return "bajamar"

    return "subiendo" if sea_levels[-1] >= sea_levels[0] else "bajando"


def infer_next_tide_event(
    condiciones: list[dict[str, Any]],
    hora_referencia: str,
    tide_status: str | None,
) -> dict[str, str] | None:
    if tide_status not in {"subiendo", "bajando"}:
        return None

    puntos = []
    for condicion in condiciones:
        hora = condicion.get("hora")
        nivel = condicion.get("sea_level_height_msl")
        if not hora or not isinstance(nivel, (int, float)):
            continue
        puntos.append((hora, float(nivel)))

    if len(puntos) < 3:
        return None

    puntos.sort(key=lambda item: item[0])
    indices_referencia = [
        index for index, (hora, _) in enumerate(puntos)
        if hora <= hora_referencia
    ]
    if not indices_referencia:
        return None

    referencia_index = indices_referencia[-1]
    if referencia_index >= len(puntos) - 2:
        return None

    if tide_status == "subiendo":
        for index in range(referencia_index + 1, len(puntos) - 1):
            valor_anterior = puntos[index - 1][1]
            valor_actual = puntos[index][1]
            valor_siguiente = puntos[index + 1][1]
            if valor_actual >= valor_anterior and valor_actual >= valor_siguiente:
                return {
                    "label": "Pleamar",
                    "hour": puntos[index][0],
                }
        return None

    for index in range(referencia_index + 1, len(puntos) - 1):
        valor_anterior = puntos[index - 1][1]
        valor_actual = puntos[index][1]
        valor_siguiente = puntos[index + 1][1]
        if valor_actual <= valor_anterior and valor_actual <= valor_siguiente:
            return {
                "label": "Bajamar",
                "hour": puntos[index][0],
            }
    return None


def infer_tide_events(condiciones: list[dict[str, Any]]) -> list[dict[str, str]]:
    puntos = []
    for condicion in condiciones:
        hora = condicion.get("hora")
        nivel = condicion.get("sea_level_height_msl")
        if not hora or not isinstance(nivel, (int, float)):
            continue
        puntos.append((hora, float(nivel)))

    if len(puntos) < 3:
        return []

    puntos.sort(key=lambda item: item[0])
    eventos: list[dict[str, str]] = []

    for index in range(1, len(puntos) - 1):
        valor_anterior = puntos[index - 1][1]
        valor_actual = puntos[index][1]
        valor_siguiente = puntos[index + 1][1]

        if valor_actual >= valor_anterior and valor_actual >= valor_siguiente:
            eventos.append({
                "label": "Pleamar",
                "hour": puntos[index][0],
            })
            continue

        if valor_actual <= valor_anterior and valor_actual <= valor_siguiente:
            eventos.append({
                "label": "Bajamar",
                "hour": puntos[index][0],
            })

    eventos_unicos: list[dict[str, str]] = []
    vistos: set[tuple[str, str]] = set()
    for evento in eventos:
        clave = (evento["label"], evento["hour"])
        if clave in vistos:
            continue
        vistos.add(clave)
        eventos_unicos.append(evento)

    return eventos_unicos


def _activity_slug(name: str | None) -> str | None:
    if not name:
        return None
    return str(name).strip().lower().replace(" ", "_")


def _normalize_beach_type(beach_type: str | None) -> str | None:
    if not beach_type:
        return beach_type

    normalized = str(beach_type).strip().lower().replace(" ", "_")
    if normalized == "roca":
        return "piscina_natural"
    return normalized


def _normalize_condition_keys(conditions: dict[str, Any] | None) -> dict[str, Any]:
    conditions = conditions or {}
    return {
        "air_temp": conditions.get("air_temp", conditions.get("temperatura_ambiente")),
        "wind_speed": conditions.get("wind_speed", conditions.get("velocidad_viento")),
        "wave_height": conditions.get("wave_height", conditions.get("altura_oleaje")),
        "water_temp": conditions.get("water_temp", conditions.get("temperatura_agua")),
        "cloud_cover": conditions.get("cloud_cover", conditions.get("nubosidad")),
        "rain_probability": conditions.get(
            "rain_probability",
            conditions.get("probabilidad_lluvia"),
        ),
        "uv_index": conditions.get("uv_index"),
        "tide": conditions.get("tide", conditions.get("marea")),
        "sea_level_height_msl": conditions.get("sea_level_height_msl"),
    }


def _normalizar_hora_texto(hora: str) -> str:
    try:
        return datetime.strptime(str(hora).strip(), "%H:%M").strftime("%H:%M")
    except ValueError as exc:
        raise ValueError("Debes indicar horas válidas con formato HH:MM.") from exc


def resolver_intervalo_horario(
    *,
    hora: str | None = None,
    hora_inicio: str | None = None,
    hora_fin: str | None = None,
) -> tuple[str, str]:
    if hora and hora_inicio is None and hora_fin is None:
        hora_normalizada = _normalizar_hora_texto(hora)
        return hora_normalizada, hora_normalizada

    if not hora_inicio or not hora_fin:
        raise ValueError("Debes indicar una hora de inicio y una hora de fin válidas.")

    hora_inicio_normalizada = _normalizar_hora_texto(hora_inicio)
    hora_fin_normalizada = _normalizar_hora_texto(hora_fin)

    inicio_dt = datetime.strptime(hora_inicio_normalizada, "%H:%M")
    fin_dt = datetime.strptime(hora_fin_normalizada, "%H:%M")
    if fin_dt <= inicio_dt:
        raise ValueError("La hora de fin debe ser posterior a la hora de inicio.")

    return hora_inicio_normalizada, hora_fin_normalizada


def generar_horas_intervalo(hora_inicio: str, hora_fin: str) -> list[str]:
    inicio_dt = datetime.strptime(hora_inicio, "%H:%M")
    fin_dt = datetime.strptime(hora_fin, "%H:%M")

    horas = []
    current_dt = inicio_dt
    while current_dt <= fin_dt:
        horas.append(current_dt.strftime("%H:%M"))
        current_dt += timedelta(hours=1)
    return horas


def agregar_condiciones_por_intervalo(
    condiciones: list[dict[str, Any]],
    horas_consideradas: list[str],
) -> dict[str, Any]:
    if not condiciones:
        return {}

    agregada: dict[str, Any] = {
        "beach_id": condiciones[0].get("beach_id"),
        "nombre_playa": condiciones[0].get("nombre_playa"),
        "fecha": condiciones[0].get("fecha"),
        "hora": horas_consideradas[0] if len(horas_consideradas) == 1 else f"{horas_consideradas[0]}-{horas_consideradas[-1]}",
        "hora_inicio": horas_consideradas[0],
        "hora_fin": horas_consideradas[-1],
        "hours_count": len(horas_consideradas),
        "horas_consideradas": horas_consideradas,
        "condiciones_por_hora": condiciones,
        "timezone": next((condicion.get("timezone") for condicion in condiciones if condicion.get("timezone")), None),
        "fuente": " / ".join(
            sorted({condicion.get("fuente") for condicion in condiciones if condicion.get("fuente")})
        ) or None,
    }

    for key in NUMERIC_CONDITION_KEYS:
        values = [
            float(condicion[key])
            for condicion in condiciones
            if isinstance(condicion.get(key), (int, float))
        ]
        agregada[key] = round(sum(values) / len(values), 2) if values else None

    tides = [condicion.get("tide") for condicion in condiciones if condicion.get("tide")]
    agregada["tide"] = Counter(tides).most_common(1)[0][0] if tides else None
    agregada["tide_status"] = infer_tide_status(condiciones)
    agregada["tide_events"] = infer_tide_events(condiciones)
    return agregada


def agregar_condiciones_por_playa(
    condiciones: list[dict[str, Any]],
    horas_consideradas: list[str],
) -> dict[int, dict[str, Any]]:
    condiciones_normalizadas = [_normalizar_condicion(condicion) for condicion in condiciones]
    beach_conditions: dict[int, list[dict[str, Any]]] = defaultdict(list)
    expected_hours = set(horas_consideradas)

    for condicion in condiciones_normalizadas:
        beach_id = condicion.get("beach_id")
        if beach_id is None:
            continue
        beach_conditions[int(beach_id)].append(condicion)

    agregadas: dict[int, dict[str, Any]] = {}
    for beach_id, hourly_conditions in beach_conditions.items():
        unique_by_hour = {}
        for condicion in hourly_conditions:
            hora_condicion = condicion.get("hora")
            if hora_condicion is None and len(horas_consideradas) == 1:
                hora_condicion = horas_consideradas[0]
                condicion = {**condicion, "hora": hora_condicion}
            if hora_condicion in expected_hours:
                unique_by_hour[hora_condicion] = condicion
        if len(unique_by_hour) != len(horas_consideradas):
            continue

        ordered_conditions = [unique_by_hour[hora] for hora in horas_consideradas]
        agregadas[beach_id] = agregar_condiciones_por_intervalo(
            ordered_conditions,
            horas_consideradas,
        )

    return agregadas


def calcular_eventos_marea_siguientes_por_playa(
    condiciones: list[dict[str, Any]],
    hora_referencia: str,
) -> dict[int, dict[str, str]]:
    condiciones_normalizadas = [_normalizar_condicion(condicion) for condicion in condiciones]
    beach_conditions: dict[int, list[dict[str, Any]]] = defaultdict(list)

    for condicion in condiciones_normalizadas:
        beach_id = condicion.get("beach_id")
        if beach_id is None:
            continue
        beach_conditions[int(beach_id)].append(condicion)

    eventos: dict[int, dict[str, str]] = {}
    for beach_id, hourly_conditions in beach_conditions.items():
        tide_status = infer_tide_status(hourly_conditions)
        siguiente_evento = infer_next_tide_event(
            hourly_conditions,
            hora_referencia,
            tide_status,
        )
        if siguiente_evento:
            eventos[beach_id] = siguiente_evento

    return eventos


def fusionar_playas(playas_locales, playas_db):
    if playas_db and "beach_id" in playas_db[0]:
        condiciones_por_id = {condicion["beach_id"]: condicion for condicion in playas_db}
        fusionadas = []

        for playa_local in playas_locales:
            playa_id = playa_local.get("id")
            condicion = condiciones_por_id.get(playa_id)
            if condicion is None:
                continue
            fusionadas.append({
                **playa_local,
                "condiciones": condicion,
            })

        return fusionadas

    locales_por_id = {
        playa["id"]: {
            **playa,
            "tipo": _normalize_beach_type(playa.get("tipo")),
            "actividades_ideales": list(playa.get("actividades_ideales") or []),
            "servicios": dict(playa.get("servicios") or {}),
        }
        for playa in playas_locales
    }
    fusionadas = []
    ids_vistos = set()

    for playa_db in playas_db:
        ids_vistos.add(playa_db["id"])
        playa_local = locales_por_id.get(playa_db["id"])
        playa_db_normalizada = {
            **playa_db,
            "tipo": _normalize_beach_type(playa_db.get("tipo")),
        }

        if playa_local:
            fusionadas.append({
                **playa_local,
                **playa_db_normalizada,
                "actividades_ideales": playa_local["actividades_ideales"],
                "servicios": playa_local["servicios"],
            })
            continue

        fusionadas.append({
            **playa_db_normalizada,
            "actividades_ideales": [],
            "servicios": {},
        })

    for playa_local in playas_locales:
        if playa_local["id"] in ids_vistos:
            continue
        fusionadas.append({
            **playa_local,
            "tipo": _normalize_beach_type(playa_local.get("tipo")),
            "actividades_ideales": list(playa_local.get("actividades_ideales") or []),
            "servicios": dict(playa_local.get("servicios") or {}),
        })

    return fusionadas


def filtrar_resultados_recomendacion(resultados, **filtros):
    filtros_normalizados = dict(filtros)
    if filtros_normalizados.get("tipo_roca"):
        filtros_normalizados["tipo_piscina_natural"] = True

    filtros_base = {
        k: v
        for k, v in filtros_normalizados.items()
        if k in {
            "tipo_arena",
            "tipo_piedra",
            "tipo_piscina_natural",
            "restaurantes",
            "comida_para_llevar",
            "balnearios",
            "zona_deportiva",
            "pet_friendly",
            "min_temperatura_ambiente",
            "max_temperatura_ambiente",
            "min_nubosidad",
            "max_nubosidad",
            "min_velocidad_viento",
            "max_velocidad_viento",
            "min_altura_oleaje",
            "max_altura_oleaje",
        }
    }
    filtros_servicio_extra = {
        k: v
        for k, v in filtros_normalizados.items()
        if k not in filtros_base and k not in {"tipo_roca", "sitios_para_comer"} and bool(v)
    }

    filtrados = []
    for resultado in resultados:
        playa = {
            "tipo": _normalize_beach_type(resultado.get("tipo")),
            "servicios": dict(resultado.get("servicios") or {}),
        }
        condiciones = _normalize_condition_keys(resultado.get("condiciones"))

        if filtros_normalizados.get("sitios_para_comer") and not (
            playa["servicios"].get("restaurantes")
            or playa["servicios"].get("comida_para_llevar")
        ):
            continue

        if not filtrar(playa, condiciones, filtros_base):
            continue

        if any(not playa["servicios"].get(servicio) for servicio in filtros_servicio_extra):
            continue

        filtrados.append(resultado)

    return filtrados

def cargar_playas() -> list[dict[str, Any]]:
    session = SessionLocal()
    try:
        metadata_por_id = {}
        if PLAYAS_JSON.exists():
            with PLAYAS_JSON.open("r", encoding="utf-8") as f:
                metadata_por_id = {playa["id"]: playa for playa in json.load(f)}

        playas = session.query(Beach).options(selectinload(Beach.services)).all()
        resultado = []
        for p in playas:
            metadata = metadata_por_id.get(p.id, {})
            servicios_dict = {
                ("balnearios" if clave == "balneario" else clave): valor
                for clave, valor in metadata.get("servicios", {}).items()
                if valor
            }
            servicios_dict.update({s.name: True for s in (p.services or [])})
            resultado.append({
                "id": p.id,
                "nombre": p.name,
                "ubicacion": p.location,
                "latitud": float(p.latitude),
                "longitud": float(p.longitude),
                "tipo": _normalize_beach_type(p.type),
                "descripcion": p.description,
                "imagen": p.image,
                "servicios": servicios_dict,
                "actividades_ideales": [
                    actividad_normalizada
                    for item in metadata.get("actividades_ideales", [])
                    for actividad_normalizada in [_activity_slug(item.get("actividad"))]
                    if actividad_normalizada
                ],
            })
        return resultado
    except Exception as e:
        logger.error(f"Error cargando playas DB: {e}")
        return []
    finally:
        session.close()


def cargar_condiciones(playas, fecha, hora):
    if settings.WEATHER_PROVIDER == "local":
        return _cargar_condiciones_locales(playas, fecha, hora)

    try:
        condiciones = cargar_condiciones_open_meteo(playas, fecha, hora)
        return [_normalizar_condicion(condicion) for condicion in condiciones]
    except OpenMeteoError as exc:
        logger.warning("Fallo consultando Open-Meteo, usando fallback local: %s", exc)
        return _cargar_condiciones_locales(playas, fecha, hora)


def cargar_condiciones_open_meteo(playas, fecha, hora):
    condiciones = obtener_condiciones_open_meteo(
        playas=playas,
        fecha=fecha,
        hora=hora,
        timezone=settings.OPEN_METEO_TIMEZONE,
        timeout_seconds=settings.OPEN_METEO_TIMEOUT_SECONDS,
    )
    return [_normalizar_condicion(condicion) for condicion in condiciones]


def cargar_condiciones_intervalo(playas, fecha, hora_inicio, hora_fin):
    if hora_inicio == hora_fin:
        return cargar_condiciones(playas, fecha, hora_inicio)

    if settings.WEATHER_PROVIDER == "local":
        return _cargar_condiciones_locales_intervalo(playas, fecha, hora_inicio, hora_fin)

    try:
        condiciones = cargar_condiciones_open_meteo_intervalo(playas, fecha, hora_inicio, hora_fin)
        return [_normalizar_condicion(condicion) for condicion in condiciones]
    except OpenMeteoError as exc:
        logger.warning("Fallo consultando Open-Meteo para el intervalo, usando fallback local: %s", exc)
        return _cargar_condiciones_locales_intervalo(playas, fecha, hora_inicio, hora_fin)


def cargar_condiciones_open_meteo_intervalo(playas, fecha, hora_inicio, hora_fin):
    condiciones = obtener_condiciones_open_meteo(
        playas=playas,
        fecha=fecha,
        hora=hora_inicio,
        hora_fin=hora_fin,
        timezone=settings.OPEN_METEO_TIMEZONE,
        timeout_seconds=settings.OPEN_METEO_TIMEOUT_SECONDS,
    )
    return [_normalizar_condicion(condicion) for condicion in condiciones]


def cargar_condiciones_locales(playas, fecha, hora):
    return _cargar_condiciones_locales(playas, fecha, hora)


def cargar_condiciones_locales_intervalo(playas, fecha, hora_inicio, hora_fin):
    return _cargar_condiciones_locales_intervalo(playas, fecha, hora_inicio, hora_fin)


def cargar_condiciones_desde_db(playas, fecha, hora):
    if not playas:
        return []

    session = SessionLocal()
    try:
        beach_ids = [int(playa["id"]) for playa in playas]
        target_dt = datetime.fromisoformat(f"{fecha}T{hora}")
        next_minute = target_dt + timedelta(minutes=1)

        rows = (
            session.query(BeachCondition)
            .filter(BeachCondition.beach_id.in_(beach_ids))
            .filter(
                and_(
                    BeachCondition.datetime >= target_dt,
                    BeachCondition.datetime < next_minute,
                )
            )
            .all()
        )

        beach_names = {int(playa["id"]): playa.get("nombre") for playa in playas}
        return [
            {
                "beach_id": row.beach_id,
                "nombre_playa": beach_names.get(int(row.beach_id)),
                "fecha": row.datetime.strftime("%Y-%m-%d"),
                "hora": row.datetime.strftime("%H:%M"),
                "air_temp": row.air_temp,
                "wind_speed": row.wind_speed,
                "wave_height": row.wave_height,
                "water_temp": row.water_temp,
                "cloud_cover": row.cloud_cover,
                "rain_probability": row.rain_probability,
                "sea_level_height_msl": row.tide,
                "tide": row.tide,
                "uv_index": row.uv_index,
                "fuente": "PostgreSQL beach_conditions",
            }
            for row in rows
        ]
    finally:
        session.close()


def cargar_condiciones_desde_db_intervalo(playas, fecha, hora_inicio, hora_fin):
    if not playas:
        return []

    if hora_inicio == hora_fin:
        return cargar_condiciones_desde_db(playas, fecha, hora_inicio)

    session = SessionLocal()
    try:
        beach_ids = [int(playa["id"]) for playa in playas]
        target_start = datetime.fromisoformat(f"{fecha}T{hora_inicio}")
        target_end = datetime.fromisoformat(f"{fecha}T{hora_fin}") + timedelta(hours=1)

        rows = (
            session.query(BeachCondition)
            .filter(BeachCondition.beach_id.in_(beach_ids))
            .filter(
                and_(
                    BeachCondition.datetime >= target_start,
                    BeachCondition.datetime < target_end,
                )
            )
            .all()
        )

        beach_names = {int(playa["id"]): playa.get("nombre") for playa in playas}
        return [
            {
                "beach_id": row.beach_id,
                "nombre_playa": beach_names.get(int(row.beach_id)),
                "fecha": row.datetime.strftime("%Y-%m-%d"),
                "hora": row.datetime.strftime("%H:%M"),
                "air_temp": row.air_temp,
                "wind_speed": row.wind_speed,
                "wave_height": row.wave_height,
                "water_temp": row.water_temp,
                "cloud_cover": row.cloud_cover,
                "rain_probability": row.rain_probability,
                "sea_level_height_msl": row.tide,
                "tide": row.tide,
                "uv_index": row.uv_index,
                "fuente": "PostgreSQL beach_conditions",
            }
            for row in rows
        ]
    finally:
        session.close()


def _normalizar_condicion(condicion: dict[str, Any]) -> dict[str, Any]:
    return {
        "beach_id": condicion["beach_id"],
        "nombre_playa": condicion.get("nombre_playa"),
        "fecha": condicion.get("fecha"),
        "hora": condicion.get("hora"),
        "air_temp": condicion.get("air_temp", condicion.get("temperatura_ambiente")),
        "wind_speed": condicion.get("wind_speed", condicion.get("velocidad_viento")),
        "wave_height": condicion.get("wave_height", condicion.get("altura_oleaje")),
        "water_temp": condicion.get("water_temp", condicion.get("temperatura_agua")),
        "cloud_cover": condicion.get("cloud_cover", condicion.get("nubosidad")),
        "rain_probability": condicion.get("rain_probability", condicion.get("probabilidad_lluvia")),
        "sea_level_height_msl": condicion.get("sea_level_height_msl", condicion.get("tide")),
        "tide": condicion.get("tide", condicion.get("marea")),
        "uv_index": condicion.get("uv_index"),
        "fuente": condicion.get("fuente"),
        "timezone": condicion.get("timezone"),
    }


def _cargar_condiciones_locales(playas, fecha, hora):
    if not CONDICIONES_JSON.exists():
        return []

    beach_ids = {playa["id"] for playa in playas}
    with CONDICIONES_JSON.open("r", encoding="utf-8") as fh:
        condiciones = json.load(fh)

    return [
        _normalizar_condicion(condicion)
        for condicion in condiciones
        if condicion.get("beach_id") in beach_ids
        and condicion.get("fecha") == fecha
        and condicion.get("hora") == hora
    ]


def _cargar_condiciones_locales_intervalo(playas, fecha, hora_inicio, hora_fin):
    if not CONDICIONES_JSON.exists():
        return []

    if hora_inicio == hora_fin:
        return _cargar_condiciones_locales(playas, fecha, hora_inicio)

    beach_ids = {playa["id"] for playa in playas}
    horas_consideradas = set(generar_horas_intervalo(hora_inicio, hora_fin))
    with CONDICIONES_JSON.open("r", encoding="utf-8") as fh:
        condiciones = json.load(fh)

    return [
        _normalizar_condicion(condicion)
        for condicion in condiciones
        if condicion.get("beach_id") in beach_ids
        and condicion.get("fecha") == fecha
        and condicion.get("hora") in horas_consideradas
    ]


def distancia_km(lat1, lon1, lat2, lon2):
    r = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def clamp(x, a=0, b=10):
    return max(a, min(b, x))


def score_cercania(valor, ideal, tol):
    if tol == 0:
        return 0
    return clamp(10 * (1 - abs(valor - ideal) / tol))


def score_inverso(valor, min_v, max_v):
    if max_v == min_v:
        return 0
    return clamp(10 * (max_v - valor) / (max_v - min_v))


def puntuar(variable, valor):
    v = float(valor)
    rules = {
        "air_temp": lambda v: score_cercania(v, 25, 10),
        "water_temp": lambda v: score_cercania(v, 22, 8),
        "wind_speed": lambda v: score_inverso(v, 0, 30),
        "wave_height": lambda v: score_cercania(v, 1.5, 1.5),
        "cloud_cover": lambda v: score_inverso(v, 0, 100),
        "rain_probability": lambda v: score_inverso(v, 0, 100),
        "uv_index": lambda v: score_cercania(v, 6, 4),
    }
    return rules.get(variable, lambda v: 5)(v)


def calcular_score(condicion, actividad, pesos: dict[str, float] | None = None):
    pesos = pesos if pesos is not None else obtener_pesos_actividad(actividad)

    total = 0
    suma_pesos = 0

    for k, v in condicion.items():
        if not isinstance(v, (int, float)) or k not in pesos:
            continue

        if k == "wind_speed":
            if actividad == "windsurf":
                score = score_cercania(v, 25, 10)   # viento alto = bueno
            else:
                score = score_inverso(v, 0, 30)     # viento bajo = bueno
        else:
            score = puntuar(k, v)

        total += score * pesos[k]
        suma_pesos += pesos[k]

    return total / suma_pesos if suma_pesos else 0


def obtener_pesos_actividad(actividad: str) -> dict[str, float]:
    actividad_normalizada = _activity_slug(actividad)
    if not actividad_normalizada:
        return {}

    session = SessionLocal()
    try:
        activity = next(
            (
                item
                for item in session.query(Activity).all()
                if _activity_slug(item.name) == actividad_normalizada
            ),
            None,
        )
        if activity is None:
            return PESOS_ACTIVIDAD.get(actividad_normalizada, {})

        pesos_db = {
            variable.name: float(weight.weight)
            for weight, variable in (
                session.query(ActivityVariableWeight, Variable)
                .join(Variable, Variable.id == ActivityVariableWeight.variable_id)
                .filter(ActivityVariableWeight.activity_id == activity.id)
                .all()
            )
            if weight.weight is not None and float(weight.weight) > 0
        }
        return pesos_db or PESOS_ACTIVIDAD.get(actividad_normalizada, {})
    except Exception as exc:
        logger.warning("No se pudieron cargar pesos de actividad desde DB: %s", exc)
        return PESOS_ACTIVIDAD.get(actividad_normalizada, {})
    finally:
        session.close()


def calcular_score_final(
    condicion,
    actividad,
    actividad_ideal: bool,
    pesos: dict[str, float] | None = None,
) -> float:
    score = calcular_score(condicion, actividad, pesos)
    if actividad_ideal:
        score += BONUS_ACTIVIDAD_IDEAL
    return clamp(score)


def filtrar(playa, conditions, filtros: dict):
    # -------------------------
    # Filtros de tipo de playa
    # -------------------------
    if filtros.get("tipo_arena") and playa["tipo"] != "arena":
        return False
    if filtros.get("tipo_piedra") and playa["tipo"] != "piedra":
        return False
    if filtros.get("tipo_piscina_natural") and playa["tipo"] != "piscina_natural":
        return False

    # -------------------------
    # Filtros de servicios básicos
    # -------------------------
    if filtros.get("restaurantes") and not playa["servicios"].get("restaurantes", False):
        return False
    if filtros.get("comida_para_llevar") and not playa["servicios"].get("comida_para_llevar", False):
        return False
    if filtros.get("balnearios") and not playa["servicios"].get("balnearios", False):
        return False
    if filtros.get("zona_deportiva") and not playa["servicios"].get("zona_deportiva", False):
        return False
    if filtros.get("pet_friendly") and not playa["servicios"].get("pet_friendly", False):
        return False

    # -------------------------
    # Filtros de escuelas / actividades
    # -------------------------
    if filtros.get("escuela_surf") and not playa["servicios"].get("escuela_surf", False):
        return False

    if filtros.get("escuela_windsurf") and not playa["servicios"].get("escuela_windsurf", False):
        return False

    if filtros.get("escuela_kayak") and not playa["servicios"].get("escuela_kayak", False):
        return False

    if filtros.get("zona_beachvolley") and not playa["servicios"].get("zona_beachvolley", False):
        return False

    # -------------------------
    # Filtros climáticos dinámicos
    # -------------------------
    if "min_velocidad_viento" in filtros:
        if conditions.get("wind_speed", 0) < filtros["min_velocidad_viento"]:
            return False
    if "max_velocidad_viento" in filtros:
        if conditions.get("wind_speed", 0) > filtros["max_velocidad_viento"]:
            return False

    if "min_temperatura_ambiente" in filtros:
        if conditions.get("air_temp", 0) < filtros["min_temperatura_ambiente"]:
            return False
    if "max_temperatura_ambiente" in filtros:
        if conditions.get("air_temp", 0) > filtros["max_temperatura_ambiente"]:
            return False

    if "min_nubosidad" in filtros:
        if conditions.get("cloud_cover", 0) < filtros["min_nubosidad"]:
            return False
    if "max_nubosidad" in filtros:
        if conditions.get("cloud_cover", 0) > filtros["max_nubosidad"]:
            return False

    if "min_altura_oleaje" in filtros:
        if conditions.get("wave_height", 0) < filtros["min_altura_oleaje"]:
            return False
    if "max_altura_oleaje" in filtros:
        if conditions.get("wave_height", 0) > filtros["max_altura_oleaje"]:
            return False

    return True


def _formatear_factor_recomendacion(variable: str, valor: float) -> str:
    label = FACTOR_LABELS.get(variable, variable)
    unit = FACTOR_UNITS.get(variable, "")
    value_text = _format_condition_value_for_display(variable, valor)
    return f"{label} de {value_text}{f' {unit}' if unit else ''}"


def generar_motivo_intervalo(
    actividad,
    cond,
    *,
    pesos: dict[str, float] | None = None,
    actividad_ideal: bool = False,
):
    pesos = pesos if pesos is not None else obtener_pesos_actividad(actividad)
    hours_count = int(cond.get("hours_count") or 1)
    horas_consideradas = list(cond.get("horas_consideradas") or [])

    variables_ordenadas = [
        variable
        for variable, _ in sorted(pesos.items(), key=lambda item: item[1], reverse=True)
        if isinstance(cond.get(variable), (int, float))
    ]
    if not variables_ordenadas:
        variables_ordenadas = [
            variable
            for variable in (
                "air_temp",
                "wind_speed",
                "wave_height",
                "rain_probability",
                "cloud_cover",
                "uv_index",
            )
            if isinstance(cond.get(variable), (int, float))
        ]

    factores = [
        _formatear_factor_recomendacion(variable, cond[variable])
        for variable in variables_ordenadas[:3]
    ]
    if not factores:
        return "Condiciones evaluadas para la actividad."

    if hours_count > 1 and len(horas_consideradas) >= 2:
        tramo = f"entre las {horas_consideradas[0]} y las {horas_consideradas[-1]}"
    elif horas_consideradas:
        tramo = f"a las {horas_consideradas[0]}"
    else:
        tramo = "en ese momento"

    descripcion = factores[0] if len(factores) == 1 else ", ".join(factores[:-1]) + f" y {factores[-1]}"
    motivo = f"Se recomienda {tramo} por {descripcion}"
    if actividad_ideal:
        motivo += ". AdemÃ¡s, la playa encaja especialmente bien con la actividad seleccionada."
    else:
        motivo += "."
    return motivo


def recomendar_playas(
    actividad: str,
    fecha: str,
    hora: str,
    lat_usuario: float | None,
    lon_usuario: float | None,
    radio_km: float | None,
    top_n: int,
    filtros: dict,
    *,
    playas_override: list[dict[str, Any]] | None = None,
    condiciones_override: list[dict[str, Any]] | None = None,
    hora_inicio: str | None = None,
    hora_fin: str | None = None,
):
    hora_inicio_resuelta, hora_fin_resuelta = resolver_intervalo_horario(
        hora=hora,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
    )
    horas_consideradas = generar_horas_intervalo(hora_inicio_resuelta, hora_fin_resuelta)

    playas = playas_override if playas_override is not None else cargar_playas()
    if condiciones_override is not None:
        condiciones = condiciones_override
    elif hora_inicio_resuelta == hora_fin_resuelta:
        condiciones = cargar_condiciones(playas, fecha, hora_inicio_resuelta)
    else:
        condiciones = cargar_condiciones_intervalo(playas, fecha, hora_inicio_resuelta, hora_fin_resuelta)

    condiciones_agregadas = agregar_condiciones_por_playa(condiciones, horas_consideradas)
    pesos_actividad = obtener_pesos_actividad(actividad)

    resultados = []
    for playa in playas:

        if lat_usuario is not None and lon_usuario is not None and radio_km is not None:
            d = distancia_km(
                lat_usuario, lon_usuario,
                playa["latitud"], playa["longitud"]
            )
            if d > radio_km:
                continue
        cond = condiciones_agregadas.get(int(playa["id"]))
        if not cond or not filtrar(playa, cond, filtros):
            continue

        actividad_ideal = actividad in set(playa.get("actividades_ideales", []))
        score = calcular_score_final(cond, actividad, actividad_ideal, pesos_actividad)
        resultados.append({
            "beach_id": playa["id"],
            "nombre": playa["nombre"],
            "ubicacion": playa["ubicacion"],
            "latitud": playa["latitud"],
            "longitud": playa["longitud"],
            "descripcion": playa["descripcion"],
            "tipo": playa["tipo"],
            "score": round(score, 2),
            "actividad_ideal": actividad_ideal,
            "condiciones": cond,
            "servicios": playa["servicios"],
            "motivo": generar_motivo_intervalo(
                actividad,
                cond,
                pesos=pesos_actividad,
                actividad_ideal=actividad_ideal,
            )
        })

    resultados_ordenados = sorted(
        resultados,
        key=lambda x: (x["actividad_ideal"], x["score"]),
        reverse=True,
    )
    if top_n <= 0:
        return resultados_ordenados
    return resultados_ordenados[:top_n]

MOTIVOS = {
    "tomar_sol": [
        "Cielo despejado y buenas condiciones para tomar el sol.",
        "Temperatura agradable para estar en la playa.",
        "Baja probabilidad de lluvia y condiciones estables."
    ],
    "surf": [
        "Buen oleaje para surf.",
        "Condiciones de viento favorables para surf.",
        "Mar con energía suficiente para maniobras."
    ],
    "nadar": [
        "Mar tranquilo ideal para nadar.",
        "Baja altura de olas para mayor seguridad.",
        "Condiciones suaves en el agua."
    ],
    "windsurf": [
        "Viento fuerte ideal para windsurf.",
        "Condiciones constantes de viento.",
        "Oleaje manejable para navegación."
    ],
    "bucear": [
        "Mar calmado y estable para buceo.",
        "Buenas condiciones de visibilidad esperadas.",
        "Poco viento en superficie."
    ],
    "caminar": [
        "Clima agradable para caminar.",
        "Baja probabilidad de lluvia.",
        "Temperaturas suaves y cómodas."
    ],
    "pescar": [
        "Oleaje moderado y condiciones apropiadas para pescar.",
        "Viento manejable para una jornada de pesca.",
        "Entorno estable para permanecer tiempo junto al agua."
    ],
    "kayak": [
        "Mar razonablemente calmado para salir en kayak.",
        "Viento contenido para remar con comodidad.",
        "Condiciones acuaticas aptas para una travesia suave."
    ],
    "kitesurf": [
        "Viento consistente favorable para kitesurf.",
        "Oleaje compatible con maniobras y navegacion.",
        "Condiciones dinamicas para disfrutar del kitesurf."
    ],
    "piscina_natural": [
        "Oleaje bajo para disfrutar mejor de la piscina natural.",
        "Condiciones tranquilas y agradables para el bano.",
        "Entorno estable para una experiencia relajada."
    ]
}

def generar_motivo(actividad, cond):
    motivos = MOTIVOS.get(actividad, [])
    if not motivos:
        return "Condiciones evaluadas para la actividad."

    candidatos = []

    if actividad == "tomar_sol":
        if cond.get("cloud_cover", 100) < 5:
            candidatos.append(motivos[0])
        if 23 <= cond.get("air_temp", 0) <= 30:
            candidatos.append(motivos[1])
        if cond.get("rain_probability", 100) < 2:
            candidatos.append(motivos[2])

    elif actividad == "surf":
        if cond.get("wave_height", 0) > 1:
            candidatos.append(motivos[0])
        if cond.get("wind_speed", 0) > 14:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    elif actividad == "nadar":
        if cond.get("wave_height", 1) < 0.8:
            candidatos.append(motivos[0])
        if cond.get("wind_speed", 10) < 12:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    elif actividad == "windsurf":
        if cond.get("wind_speed", 0) > 15:
            candidatos.append(motivos[0])
        elif 10 <= cond.get("wind_speed", 0) <= 20:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    elif actividad == "bucear":
        if cond.get("wave_height", 1) < 1:
            candidatos.append(motivos[0])
        if cond.get("wind_speed", 0) < 15:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    elif actividad == "caminar":
        if 18 <= cond.get("air_temp", 0) <= 28:
            candidatos.append(motivos[0])
        if cond.get("rain_probability", 100) < 5:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    elif actividad == "pescar":
        if 0.4 <= cond.get("wave_height", 0) <= 1.5:
            candidatos.append(motivos[0])
        if cond.get("wind_speed", 99) < 18:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    elif actividad == "kayak":
        if cond.get("wave_height", 99) < 1.0:
            candidatos.append(motivos[0])
        if cond.get("wind_speed", 99) < 16:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    elif actividad == "kitesurf":
        if cond.get("wind_speed", 0) >= 18:
            candidatos.append(motivos[0])
        if cond.get("wave_height", 0) >= 0.8:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    elif actividad == "piscina_natural":
        if cond.get("wave_height", 99) < 0.8:
            candidatos.append(motivos[0])
        if cond.get("wind_speed", 99) < 14:
            candidatos.append(motivos[1])
        candidatos.append(motivos[2])

    return candidatos[0] if candidatos else motivos[0]

def _legacy_fusionar_playas(playas, datos):
    """
    Compatibilidad con tests antiguos.

    Si `datos` contiene `beach_id`, se interpreta como condiciones.
    Si contiene `id`, se interpreta como playas DB y se fusionan
    sobrescribiendo coordenadas y metadatos.
    """

    if not datos:
        return playas

    # Caso 1: condiciones meteorológicas
    if "beach_id" in datos[0]:
        condiciones_por_id = {
            c["beach_id"]: c for c in datos
        }

        fusionadas = []

        for playa in playas:
            playa_id = playa.get("id")
            condicion = condiciones_por_id.get(playa_id)

            if condicion:
                playa_fusionada = {
                    **playa,
                    "condiciones": condicion,
                }
                fusionadas.append(playa_fusionada)

        return fusionadas

    # Caso 2: playas DB
    playas_por_id = {p["id"]: dict(p) for p in playas}

    for playa_db in datos:
        playa_id = playa_db["id"]

        if playa_id in playas_por_id:
            original = playas_por_id[playa_id]

            playas_por_id[playa_id] = {
                **original,
                **playa_db,
                # conservar metadata local
                "servicios": original.get("servicios", {}),
                "actividades_ideales": original.get("actividades_ideales", []),
            }
        else:
            playas_por_id[playa_id] = {
                **playa_db,
                "servicios": playa_db.get("servicios", {}),
                "actividades_ideales": playa_db.get("actividades_ideales", []),
            }

    return list(playas_por_id.values())


def _legacy_filtrar_resultados_recomendacion(resultados, **filtros):
    filtrados = []

    for resultado in resultados:
        playa = {
            "tipo": _normalize_beach_type(resultado.get("tipo")),
            "servicios": resultado.get("servicios", {}),
            "actividades_ideales": resultado.get("actividades_ideales", []),
        }

        condiciones_originales = resultado.get("condiciones", {})

        condiciones = {
            "air_temp": condiciones_originales.get(
                "air_temp",
                condiciones_originales.get("temperatura_ambiente")
            ),
            "cloud_cover": condiciones_originales.get(
                "cloud_cover",
                condiciones_originales.get("nubosidad")
            ),
            "wind_speed": condiciones_originales.get(
                "wind_speed",
                condiciones_originales.get("velocidad_viento")
            ),
            "wave_height": condiciones_originales.get(
                "wave_height",
                condiciones_originales.get("altura_oleaje")
            ),
        }

        filtros_normalizados = dict(filtros)

        if filtros_normalizados.get("tipo_roca"):
            filtros_normalizados["tipo_piscina_natural"] = True

        if filtros_normalizados.get("sitios_para_comer"):
            servicios = playa["servicios"]
            if not (
                servicios.get("restaurantes")
                or servicios.get("comida_para_llevar")
            ):
                continue

        servicios = playa["servicios"]

        # -----------------------------
        # FILTRO DE SERVICIOS
        # -----------------------------
        servicios_map = [
            "escuela_surf",
            "escuela_windsurf",
            "escuela_kayak",
            "zona_beachvolley",
            "zona_deportiva",
            "restaurantes",
            "comida_para_llevar",
            "balnearios",
            "pet_friendly",
        ]

        for clave in servicios_map:
            if filtros_normalizados.get(clave) is True:
                if not servicios.get(clave, False):
                    break
        else:
            # -----------------------------
            # FILTROS GENERALES
            # -----------------------------
            if filtrar(playa, condiciones, filtros_normalizados):
                filtrados.append(resultado)

    return filtrados
