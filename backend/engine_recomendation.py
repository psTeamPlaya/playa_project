import math, logging, requests
import json
from pathlib import Path
from typing import Any
import os
import requests
from backend.db import SessionLocal
from backend.models.beach import Beach

logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parent
PLAYAS_JSON = BASE_DIR / "playas.json"

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
                "tipo": p.type,
                "descripcion": p.description,
                "imagen": p.image,
                "servicios": servicios_dict
            })
        return resultado
    except Exception as e:
        logger.error(f"Error cargando playas DB: {e}")
        return []
    finally:
        session.close()


def cargar_condiciones(playas, fecha, hora):
    base_url = os.getenv("BEACH_API_URL", "http://127.0.0.1:8000")
    url = f"{base_url}/beach-conditions"
    # url = "http://127.0.0.1:8000/beach-conditions"
    datetime = f"{fecha} {hora}"
    r = requests.post(
        url,
        params={"datetime": datetime},
        json={"playas": playas},
        timeout=10
    )
    r.raise_for_status()
    return r.json() or []


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
    pesos = PESOS_ACTIVIDAD.get(actividad, {})

    total = 0
    suma_pesos = 0
    for k, v in condicion.items():
        if not isinstance(v, (int, float)) or k not in pesos:
            continue
        score = puntuar(k, v)
        total += score * pesos[k]
        suma_pesos += pesos[k]

    return total / suma_pesos if suma_pesos else 0


def filtrar(playa, conditions, filtros: dict):
    # Filtros de datos fijos
    if filtros.get("tipo_arena") and playa["tipo"] != "arena":
        return False
    if filtros.get("tipo_piedra") and playa["tipo"] != "piedra":
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

        score = calcular_score(cond, actividad)
        resultados.append({
            "beach_id": playa["id"],
            "nombre": playa["nombre"],
            "ubicacion": playa["ubicacion"],
            "latitud": playa["latitud"],
            "longitud": playa["longitud"],
            "descripcion": playa["descripcion"],
            "tipo": playa["tipo"],
            "score": round(score, 2),
            "condiciones": cond,
            "servicios": playa["servicios"],
            "motivo": generar_motivo(actividad, cond)
        })

    resultados_ordenados = sorted(resultados, key=lambda x: x["score"], reverse=True)
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
