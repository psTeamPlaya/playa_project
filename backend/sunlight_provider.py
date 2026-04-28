from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from typing import Any

import requests

SUNLIGHT_URL = "https://api.open-meteo.com/v1/forecast"


class SunlightError(RuntimeError):
    pass


def _fetch_json(url: str, params: dict[str, Any], timeout_seconds: int) -> dict[str, Any]:
    try:
        response = requests.get(url, params=params, timeout=timeout_seconds)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise SunlightError(f"Open-Meteo sunlight request failed: {exc}") from exc
    return response.json()


def _build_query_params(
    latitude: float,
    longitude: float,
    fecha: str,
    timezone: str,
) -> dict[str, Any]:
    return {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "sunrise,sunset",
        "timezone": timezone,
        "start_date": fecha,
        "end_date": fecha,
    }


@lru_cache(maxsize=256)
def _fetch_sunrise_sunset(
    latitude: float,
    longitude: float,
    fecha: str,
    timezone: str,
    timeout_seconds: int,
) -> tuple[datetime, datetime]:
    payload = _fetch_json(
        SUNLIGHT_URL,
        _build_query_params(latitude, longitude, fecha, timezone),
        timeout_seconds,
    )
    daily = payload.get("daily") or {}
    sunrise_values = daily.get("sunrise") or []
    sunset_values = daily.get("sunset") or []

    if not sunrise_values or not sunset_values:
        raise SunlightError("Open-Meteo returned no sunrise/sunset data.")

    return (
        datetime.fromisoformat(sunrise_values[0]),
        datetime.fromisoformat(sunset_values[0]),
    )


def _obtener_coordenadas_representativas(playas: list[dict[str, Any]]) -> tuple[float, float]:
    latitudes = [float(playa["latitud"]) for playa in playas]
    longitudes = [float(playa["longitud"]) for playa in playas]
    return (
        sum(latitudes) / len(latitudes),
        sum(longitudes) / len(longitudes),
    )


def _formatear_hora(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def obtener_aviso_luz_solar(
    actividad: str,
    playas: list[dict[str, Any]],
    fecha: str,
    hora: str,
    timezone: str,
    timeout_seconds: int,
) -> dict[str, str] | None:
    if actividad != "tomar_sol" or not playas:
        return None

    latitud, longitud = _obtener_coordenadas_representativas(playas)
    sunrise_dt, sunset_dt = _fetch_sunrise_sunset(
        latitud,
        longitud,
        fecha,
        timezone,
        timeout_seconds,
    )
    hora_consulta = datetime.fromisoformat(f"{fecha}T{hora}")

    if hora_consulta < sunrise_dt:
        sunrise_text = _formatear_hora(sunrise_dt)
        return {
            "tipo": "antes_amanecer",
            "mensaje": f"A esa hora todavía no ha salido el sol. El sol saldrá a las {sunrise_text} horas",
        }

    if hora_consulta >= sunset_dt:
        sunset_text = _formatear_hora(sunset_dt)
        return {
            "tipo": "despues_atardecer",
            "mensaje": f"El sol se pondrá a las {sunset_text} horas",
        }

    return None
