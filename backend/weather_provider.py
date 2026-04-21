from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from typing import Any

import requests

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

WEATHER_HOURLY_VARIABLES = (
    "temperature_2m",
    "wind_speed_10m",
    "cloud_cover",
    "precipitation_probability",
)
MARINE_HOURLY_VARIABLES = (
    "wave_height",
    "sea_surface_temperature",
    "sea_level_height_msl",
)


class OpenMeteoError(RuntimeError):
    pass


def _build_weather_params(
    latitud: float,
    longitud: float,
    fecha: str,
    timezone: str,
) -> dict[str, Any]:
    return {
        "latitude": latitud,
        "longitude": longitud,
        "hourly": ",".join(WEATHER_HOURLY_VARIABLES),
        "timezone": timezone,
        "start_date": fecha,
        "end_date": fecha,
    }


def _build_marine_params(
    latitud: float,
    longitud: float,
    fecha: str,
    timezone: str,
) -> dict[str, Any]:
    return {
        "latitude": latitud,
        "longitude": longitud,
        "hourly": ",".join(MARINE_HOURLY_VARIABLES),
        "timezone": timezone,
        "start_date": fecha,
        "end_date": fecha,
    }


def _fetch_json(url: str, params: dict[str, Any], timeout_seconds: int) -> dict[str, Any]:
    try:
        response = requests.get(url, params=params, timeout=timeout_seconds)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise OpenMeteoError(f"Open-Meteo request failed: {exc}") from exc
    return response.json()


@lru_cache(maxsize=256)
def _fetch_weather_day(
    latitud: float,
    longitud: float,
    fecha: str,
    timezone: str,
    timeout_seconds: int,
) -> dict[str, Any]:
    return _fetch_json(
        WEATHER_URL,
        _build_weather_params(latitud, longitud, fecha, timezone),
        timeout_seconds,
    )


@lru_cache(maxsize=256)
def _fetch_marine_day(
    latitud: float,
    longitud: float,
    fecha: str,
    timezone: str,
    timeout_seconds: int,
) -> dict[str, Any]:
    return _fetch_json(
        MARINE_URL,
        _build_marine_params(latitud, longitud, fecha, timezone),
        timeout_seconds,
    )


def _find_hourly_values(
    data: dict[str, Any],
    timestamp: str,
    variable_names: tuple[str, ...],
) -> dict[str, Any] | None:
    hourly = data.get("hourly") or {}
    times = hourly.get("time") or []

    try:
        index = times.index(timestamp)
    except ValueError:
        return None

    values: dict[str, Any] = {}
    for variable in variable_names:
        serie = hourly.get(variable)
        values[variable] = serie[index] if serie is not None else None
    return values


def _infer_marea(sea_level_height_msl: float | None) -> str:
    if sea_level_height_msl is None:
        return "media"
    if sea_level_height_msl <= -0.10:
        return "baja"
    if sea_level_height_msl >= 0.10:
        return "alta"
    return "media"


def obtener_condicion_open_meteo(
    playa: dict[str, Any],
    fecha: str,
    hora: str,
    timezone: str,
    timeout_seconds: int,
) -> dict[str, Any] | None:
    timestamp = f"{fecha}T{hora}"

    weather = _fetch_weather_day(
        float(playa["latitud"]),
        float(playa["longitud"]),
        fecha,
        timezone,
        timeout_seconds,
    )
    marine = _fetch_marine_day(
        float(playa["latitud"]),
        float(playa["longitud"]),
        fecha,
        timezone,
        timeout_seconds,
    )

    weather_values = _find_hourly_values(weather, timestamp, WEATHER_HOURLY_VARIABLES)
    marine_values = _find_hourly_values(marine, timestamp, MARINE_HOURLY_VARIABLES)
    if weather_values is None or marine_values is None:
        return None

    dt = datetime.fromisoformat(timestamp)
    sea_level_height_msl = marine_values["sea_level_height_msl"]

    return {
        "playa_id": playa["id"],
        "nombre_playa": playa["nombre"],
        "fecha": dt.strftime("%Y-%m-%d"),
        "hora": dt.strftime("%H:%M"),
        "temperatura_ambiente": weather_values["temperature_2m"],
        "velocidad_viento": weather_values["wind_speed_10m"],
        "altura_oleaje": marine_values["wave_height"],
        "temperatura_agua": marine_values["sea_surface_temperature"],
        "nubosidad": weather_values["cloud_cover"],
        "probabilidad_lluvia": weather_values["precipitation_probability"],
        "sea_level_height_msl": sea_level_height_msl,
        "marea": _infer_marea(sea_level_height_msl),
        "fuente": "Open-Meteo Forecast API + Marine Weather API",
        "timezone": timezone,
    }


def obtener_condiciones_open_meteo(
    playas: list[dict[str, Any]],
    fecha: str,
    hora: str,
    timezone: str,
    timeout_seconds: int,
) -> list[dict[str, Any]]:
    condiciones: list[dict[str, Any]] = []
    last_error: OpenMeteoError | None = None

    for playa in playas:
        try:
            condicion = obtener_condicion_open_meteo(
                playa=playa,
                fecha=fecha,
                hora=hora,
                timezone=timezone,
                timeout_seconds=timeout_seconds,
            )
        except OpenMeteoError as exc:
            last_error = exc
            continue

        if condicion is not None:
            condiciones.append(condicion)

    if condiciones:
        return condiciones

    if last_error is not None:
        raise last_error

    raise OpenMeteoError("Open-Meteo returned no hourly data for the requested date/time.")
