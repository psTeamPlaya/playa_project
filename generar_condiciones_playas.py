from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import requests

START_ISO = "2026-04-20T00:00"
END_ISO = "2026-04-27T23:00"
TIMEZONE = "Atlantic/Canary"

# Catálogo base de playas usado en el proyecto
PLAYAS = [
    {"id": 1, "nombre": "Las Canteras", "latitud": 28.1416, "longitud": -15.4328},
    {"id": 2, "nombre": "Maspalomas", "latitud": 27.7394, "longitud": -15.5860},
    {"id": 3, "nombre": "El Confital", "latitud": 28.1537, "longitud": -15.4505},
    {"id": 4, "nombre": "Pozo Izquierdo", "latitud": 27.8242, "longitud": -15.4448},
    {"id": 5, "nombre": "Playa de Amadores", "latitud": 27.7897, "longitud": -15.7303},
    {"id": 6, "nombre": "Playa del Inglés", "latitud": 27.7562, "longitud": -15.5665},
    {"id": 7, "nombre": "Puerto Rico", "latitud": 27.7889, "longitud": -15.7126},
    {"id": 8, "nombre": "Anfi del Mar", "latitud": 27.7777, "longitud": -15.7102},
    {"id": 9, "nombre": "Sardina del Norte", "latitud": 28.1654, "longitud": -15.6990},
    {"id": 10, "nombre": "La Laja", "latitud": 28.0894, "longitud": -15.4135},
    {"id": 11, "nombre": "Melenara", "latitud": 27.9877, "longitud": -15.3751},
    {"id": 12, "nombre": "La Garita", "latitud": 28.0065, "longitud": -15.3767},
    {"id": 13, "nombre": "Meloneras", "latitud": 27.7351, "longitud": -15.5989},
    {"id": 14, "nombre": "Playa del Cabrón", "latitud": 27.8545, "longitud": -15.3804},
    {"id": 15, "nombre": "Salinetas", "latitud": 27.9966, "longitud": -15.3649},
    {"id": 16, "nombre": "San Agustín", "latitud": 27.7676, "longitud": -15.5494},
    {"id": 17, "nombre": "Arinaga", "latitud": 27.8559, "longitud": -15.3926},
    {"id": 18, "nombre": "Tufia", "latitud": 27.9614, "longitud": -15.3523},
]

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

START_DATE = START_ISO[:10]
END_DATE = END_ISO[:10]

START_DT = datetime.fromisoformat(START_ISO)
END_DT = datetime.fromisoformat(END_ISO)


def _build_params_weather(playa: dict[str, Any]) -> dict[str, Any]:
    return {
        "latitude": playa["latitud"],
        "longitude": playa["longitud"],
        "hourly": "temperature_2m,wind_speed_10m,cloud_cover,precipitation_probability",
        "timezone": TIMEZONE,
        "start_date": START_DATE,
        "end_date": END_DATE,
    }


def _build_params_marine(playa: dict[str, Any]) -> dict[str, Any]:
    return {
        "latitude": playa["latitud"],
        "longitude": playa["longitud"],
        "hourly": "wave_height,sea_surface_temperature,sea_level_height_msl",
        "timezone": TIMEZONE,
        "start_date": START_DATE,
        "end_date": END_DATE,
    }


def _fetch_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()
    return response.json()


def _hourly_to_dict(data: dict[str, Any], variable_names: list[str]) -> dict[str, dict[str, Any]]:
    hourly = data["hourly"]
    times = hourly["time"]
    out: dict[str, dict[str, Any]] = {}

    for idx, timestamp in enumerate(times):
        out[timestamp] = {}
        for var in variable_names:
            series = hourly.get(var)
            out[timestamp][var] = series[idx] if series is not None else None
    return out


def _infer_marea(sea_level_height_msl: float | None) -> str:
    """
    Aproximación simple para mantener compatibilidad con motor actual.
    Ojo: NO es una marea astronómica real; es una discretización de sea_level_height_msl.
    """
    if sea_level_height_msl is None:
        return "media"
    if sea_level_height_msl <= -0.10:
        return "baja"
    if sea_level_height_msl >= 0.10:
        return "alta"
    return "media"


def generar_condiciones() -> list[dict[str, Any]]:
    resultado: list[dict[str, Any]] = []

    for playa in PLAYAS:
        weather = _fetch_json(WEATHER_URL, _build_params_weather(playa))
        marine = _fetch_json(MARINE_URL, _build_params_marine(playa))

        weather_map = _hourly_to_dict(
            weather,
            ["temperature_2m", "wind_speed_10m", "cloud_cover", "precipitation_probability"],
        )
        marine_map = _hourly_to_dict(
            marine,
            ["wave_height", "sea_surface_temperature", "sea_level_height_msl"],
        )

        all_times = sorted(set(weather_map.keys()) & set(marine_map.keys()))

        for timestamp in all_times:
            dt = datetime.fromisoformat(timestamp)
            if dt < START_DT or dt > END_DT:
                continue

            w = weather_map[timestamp]
            m = marine_map[timestamp]

            resultado.append({
                "playa_id": playa["id"],
                "nombre_playa": playa["nombre"],
                "fecha": dt.strftime("%Y-%m-%d"),
                "hora": dt.strftime("%H:%M"),
                "temperatura_ambiente": w["temperature_2m"],
                "velocidad_viento": w["wind_speed_10m"],
                "altura_oleaje": m["wave_height"],
                "temperatura_agua": m["sea_surface_temperature"],
                "nubosidad": w["cloud_cover"],
                "probabilidad_lluvia": w["precipitation_probability"],
                "sea_level_height_msl": m["sea_level_height_msl"],
                "marea": _infer_marea(m["sea_level_height_msl"]),
                "fuente": "Open-Meteo Forecast API + Marine Weather API",
                "timezone": TIMEZONE,
            })

    return resultado


def main() -> None:
    condiciones = generar_condiciones()
    with open("condiciones_playas.json", "w", encoding="utf-8") as f:
        json.dump(condiciones, f, ensure_ascii=False, indent=2)

    print(f"Generado condiciones_playas.json con {len(condiciones)} registros.")


if __name__ == "__main__":
    main()
