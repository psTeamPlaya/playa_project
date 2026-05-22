from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from functools import lru_cache
import requests
from typing import Any
import json

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

WEATHER_HOURLY_VARIABLES = (
    "temperature_2m",
    "wind_speed_10m",
    "cloud_cover",
    "precipitation_probability",
    "uv_index",
)

MARINE_HOURLY_VARIABLES = (
    "wave_height",
    "sea_surface_temperature",
    "sea_level_height_msl",
)


class OpenMeteoError(RuntimeError):
    pass


def _fetch_json(url: str, params: dict[str, Any], timeout_seconds: int) -> dict[str, Any]:
    try:
        response = requests.get(
            url,
            params=params,
            timeout=timeout_seconds,
        )

        response.raise_for_status()

        return response.json()

    except (
        requests.HTTPError,
        requests.ConnectionError,
        requests.Timeout,
        requests.RequestException,
        ValueError,
    ) as exc:
        raise OpenMeteoError(
            f"Open-Meteo request failed: {exc}"
        ) from exc


def _build_coordinate_params(
    playas: tuple[tuple[float, float], ...]
) -> dict[str, str]:
    return {
        "latitude": ",".join(str(latitud) for latitud, _ in playas),
        "longitude": ",".join(str(longitud) for _, longitud in playas),
    }


def _normalize_batch_response(
    data: Any,
) -> tuple[dict[str, Any], ...]:

    if isinstance(data, list):
        return tuple(data)

    if isinstance(data, dict):
        return (data,)

    raise OpenMeteoError(
        "Open-Meteo returned an unexpected payload."
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

        values[variable] = (
            serie[index]
            if serie is not None
            else None
        )

    return values


def _infer_marea(
    sea_level_height_msl: float | None
) -> str:

    if sea_level_height_msl is None:
        return "media"

    if sea_level_height_msl <= -0.10:
        return "baja"

    if sea_level_height_msl >= 0.10:
        return "alta"

    return "media"


def _fetch_single_location_payload(
    weather_payload: dict[str, Any],
    marine_payload: dict[str, Any],
    timestamp: str,
) -> dict[str, Any] | None:

    weather_values = _find_hourly_values(
        weather_payload,
        timestamp,
        WEATHER_HOURLY_VARIABLES,
    )

    marine_values = _find_hourly_values(
        marine_payload,
        timestamp,
        MARINE_HOURLY_VARIABLES,
    )

    if weather_values is None or marine_values is None:
        return None

    sea_level_height_msl = (
        marine_values["sea_level_height_msl"]
    )

    return {
        "temperatura_ambiente": weather_values["temperature_2m"],
        "velocidad_viento": weather_values["wind_speed_10m"],
        "altura_oleaje": marine_values["wave_height"],
        "temperatura_agua": marine_values["sea_surface_temperature"],
        "nubosidad": weather_values["cloud_cover"],
        "probabilidad_lluvia": weather_values["precipitation_probability"],
        "uv_index": weather_values["uv_index"],
        "sea_level_height_msl": sea_level_height_msl,
        "marea": _infer_marea(sea_level_height_msl),
    }


def obtener_condicion_open_meteo(
    playa: dict[str, Any],
    condiciones: dict[str, Any],
    fecha: str,
    hora: str,
) -> dict[str, Any]:

    dt = datetime.fromisoformat(
        f"{fecha}T{hora}"
    )

    return {
        "beach_id": playa["id"],
        "nombre_playa": playa["nombre"],
        "fecha": dt.strftime("%Y-%m-%d"),
        "hora": dt.strftime("%H:%M"),
        **condiciones,
        "fuente": "Open-Meteo Forecast API + Marine Weather API",
    }


def _build_weather_query_params(
    playas: tuple[tuple[float, float], ...],
    start_timestamp: str,
    end_timestamp: str,
    timezone: str,
) -> dict[str, Any]:

    return {
        **_build_coordinate_params(playas),
        "hourly": ",".join(
            WEATHER_HOURLY_VARIABLES
        ),
        "timezone": timezone,
        "start_hour": start_timestamp,
        "end_hour": end_timestamp,
    }


def _build_marine_query_params(
    playas: tuple[tuple[float, float], ...],
    start_timestamp: str,
    end_timestamp: str,
    timezone: str,
) -> dict[str, Any]:

    return {
        **_build_coordinate_params(playas),
        "hourly": ",".join(
            MARINE_HOURLY_VARIABLES
        ),
        "timezone": timezone,
        "start_hour": start_timestamp,
        "end_hour": end_timestamp,
    }


@lru_cache(maxsize=256)
def _fetch_weather_batch(
    playas: tuple[tuple[float, float], ...],
    start_timestamp: str,
    end_timestamp: str,
    timezone: str,
    timeout_seconds: int,
) -> tuple[dict[str, Any], ...]:

    return _normalize_batch_response(
        _fetch_json(
            WEATHER_URL,
            _build_weather_query_params(playas, start_timestamp, end_timestamp, timezone),
            timeout_seconds,
        )
    )


@lru_cache(maxsize=256)
def _fetch_marine_batch(
    playas: tuple[tuple[float, float], ...],
    start_timestamp: str,
    end_timestamp: str,
    timezone: str,
    timeout_seconds: int,
) -> tuple[dict[str, Any], ...]:

    return _normalize_batch_response(
        _fetch_json(
            MARINE_URL,
            _build_marine_query_params(playas, start_timestamp, end_timestamp, timezone),
            timeout_seconds,
        )
    )


def _generar_timestamps_intervalo(fecha: str, hora_inicio: str, hora_fin: str) -> list[str]:
    start_dt = datetime.fromisoformat(f"{fecha}T{hora_inicio}")
    end_dt = datetime.fromisoformat(f"{fecha}T{hora_fin}")
    timestamps: list[str] = []
    current_dt = start_dt
    while current_dt <= end_dt:
        timestamps.append(current_dt.strftime("%Y-%m-%dT%H:%M"))
        current_dt += timedelta(hours=1)
    return timestamps


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


def _print_openmeteo_terminal_snapshot(
    *,
    fecha: str,
    hora: str,
    hora_fin: str | None = None,
    timezone: str,
    condiciones: list[dict[str, Any]],
) -> None:
    tramo_horario = f"{hora}-{hora_fin}" if hora_fin and hora_fin != hora else hora
    print(
        f"[Open-Meteo] Datos remotos para recomendaciones "
        f"{fecha} {tramo_horario} ({timezone}) - {len(condiciones)} playas"
    )
    for condicion in condiciones:
        print(f"[Open-Meteo] {json.dumps(condicion, ensure_ascii=False, sort_keys=True)}")


def obtener_condiciones_open_meteo(
    playas: list[dict[str, Any]],
    fecha: str,
    hora: str,
    timezone: str,
    timeout_seconds: int,
    hora_fin: str | None = None,
) -> list[dict[str, Any]]:

    if not playas:
        return []

    hora_fin_resuelta = hora_fin or hora
    timestamps = _generar_timestamps_intervalo(fecha, hora, hora_fin_resuelta)
    start_timestamp = timestamps[0]
    end_timestamp = timestamps[-1]
    coordenadas = tuple(
        (
            float(playa["latitud"]),
            float(playa["longitud"]),
        )
        for playa in playas
    )

    with ThreadPoolExecutor(max_workers=2) as executor:

        weather_future = executor.submit(
            _fetch_weather_batch,
            coordenadas,
            start_timestamp,
            end_timestamp,
            timezone,
            timeout_seconds,
        )

        marine_future = executor.submit(
            _fetch_marine_batch,
            coordenadas,
            start_timestamp,
            end_timestamp,
            timezone,
            timeout_seconds,
        )

        weather_payloads = weather_future.result()

        marine_payloads = marine_future.result()

    if (
        len(weather_payloads) != len(playas)
        or len(marine_payloads) != len(playas)
    ):
        raise OpenMeteoError(
            "Open-Meteo returned an unexpected number of locations."
        )

    condiciones: list[dict[str, Any]] = []
    for playa, weather_payload, marine_payload in zip(playas, weather_payloads, marine_payloads):
        for timestamp in timestamps:
            condicion = _fetch_single_location_payload(weather_payload, marine_payload, timestamp)
            if condicion is None:
                continue
            condition_dt = datetime.fromisoformat(timestamp)
            condiciones.append(
                obtener_condicion_open_meteo(
                    playa,
                    condicion,
                    condition_dt.strftime("%Y-%m-%d"),
                    condition_dt.strftime("%H:%M"),
                )
            )

    if condiciones:
        _print_openmeteo_terminal_snapshot(
            fecha=fecha,
            hora=hora,
            hora_fin=hora_fin_resuelta,
            timezone=timezone,
            condiciones=condiciones,
        )
        return condiciones

    raise OpenMeteoError(
        "Open-Meteo returned no hourly data for the requested date/time."
    )