import math, logging
import json
from pathlib import Path
from typing import Any
from backend.config import settings
from backend.db import SessionLocal
from backend.models.activity import Activity
from backend.models.activity_variable_weight import ActivityVariableWeight
from backend.models.beach import Beach
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


def fusionar_playas(playas_locales, playas_db):
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
        if k not in filtros_base and bool(v)
    }

    filtrados = []
    for resultado in resultados:
        playa = {
            "tipo": _normalize_beach_type(resultado.get("tipo")),
            "servicios": dict(resultado.get("servicios") or {}),
        }
        condiciones = _normalize_condition_keys(resultado.get("condiciones"))

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

        playas = session.query(Beach).all()
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
        condiciones = obtener_condiciones_open_meteo(
            playas=playas,
            fecha=fecha,
            hora=hora,
            timezone=settings.OPEN_METEO_TIMEZONE,
            timeout_seconds=settings.OPEN_METEO_TIMEOUT_SECONDS,
        )
        return [_normalizar_condicion(condicion) for condicion in condiciones]
    except OpenMeteoError as exc:
        logger.warning("Fallo consultando Open-Meteo, usando fallback local: %s", exc)
        return _cargar_condiciones_locales(playas, fecha, hora)


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
        "sea_level_height_msl": condicion.get("sea_level_height_msl"),
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


def calcular_score(condicion, actividad):
    pesos = obtener_pesos_actividad(actividad)

    total = 0
    suma_pesos = 0
    for k, v in condicion.items():
        if not isinstance(v, (int, float)) or k not in pesos:
            continue
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


def calcular_score_final(condicion, actividad, actividad_ideal: bool) -> float:
    score = calcular_score(condicion, actividad)
    if actividad_ideal:
        score += BONUS_ACTIVIDAD_IDEAL
    return clamp(score)


def filtrar(playa, conditions, filtros: dict):
    # Filtros de datos fijos
    if filtros.get("tipo_arena") and playa["tipo"] != "arena":
        return False
    if filtros.get("tipo_piedra") and playa["tipo"] != "piedra":
        return False
    if filtros.get("tipo_piscina_natural") and playa["tipo"] != "piscina_natural":
        return False
    
    if filtros.get("restaurantes") and not playa["servicios"].get("restaurantes"):
        return False
    if filtros.get("comida_para_llevar") and not playa["servicios"].get("comida_para_llevar"):
        return False
    if filtros.get("balnearios") and not playa["servicios"].get("balnearios"):
        return False
    if filtros.get("zona_deportiva") and not playa["servicios"].get("zona_deportiva"):
        return False
    if filtros.get("pet_friendly") and not playa["servicios"].get("pet_friendly"):
        return False

    # Filtros de datos dinámicos
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


def recomendar_playas(
    actividad: str,
    fecha: str,
    hora: str,
    lat_usuario: float | None,
    lon_usuario: float | None,
    radio_km: float | None,
    top_n: int,
    filtros: dict
):
    playas = cargar_playas()
    condiciones = cargar_condiciones(playas, fecha, hora)

    resultados = []
    for playa in playas:

        if lat_usuario is not None and lon_usuario is not None and radio_km is not None:
            d = distancia_km(
                lat_usuario, lon_usuario,
                playa["latitud"], playa["longitud"]
            )
            if d > radio_km:
                continue
        cond = next(
            (c for c in condiciones if c["beach_id"] == playa["id"]),
            None
        )
        if not cond or not filtrar(playa, cond, filtros):
            continue

        actividad_ideal = actividad in set(playa.get("actividades_ideales", []))
        score = calcular_score_final(cond, actividad, actividad_ideal)
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
            "motivo": generar_motivo(actividad, cond)
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
