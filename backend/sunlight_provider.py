from __future__ import annotations

from datetime import date, datetime, time, timedelta
from functools import lru_cache
from math import acos, asin, atan, cos, degrees, floor, radians, sin, tan
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import requests

SUNLIGHT_URL = "https://api.open-meteo.com/v1/forecast"


class SunlightError(RuntimeError):
    pass


def _fetch_json(
    url: str,
    params: dict[str, Any],
    timeout_seconds: int,
) -> dict[str, Any]:

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

        raise SunlightError(
            f"Open-Meteo sunlight request failed: {exc}"
        ) from exc


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
        _build_query_params(
            latitude,
            longitude,
            fecha,
            timezone,
        ),
        timeout_seconds,
    )

    daily = payload.get("daily") or {}

    sunrise_values = (
        daily.get("sunrise") or []
    )

    sunset_values = (
        daily.get("sunset") or []
    )

    if not sunrise_values or not sunset_values:
        raise SunlightError(
            "Open-Meteo returned no sunrise/sunset data."
        )

    return (
        datetime.fromisoformat(
            sunrise_values[0]
        ),
        datetime.fromisoformat(
            sunset_values[0]
        ),
    )


def _obtener_coordenadas_representativas(
    playas: list[dict[str, Any]]
) -> tuple[float, float]:

    latitudes = [
        float(playa["latitud"])
        for playa in playas
    ]

    longitudes = [
        float(playa["longitud"])
        for playa in playas
    ]

    return (
        sum(latitudes) / len(latitudes),
        sum(longitudes) / len(longitudes),
    )


def _formatear_hora(
    dt: datetime
) -> str:

    return dt.strftime("%H:%M")


def _normalize_angle(angle: float) -> float:
    return angle % 360


def _calculate_solar_event_utc_hour(
    fecha: date,
    latitude: float,
    longitude: float,
    is_sunrise: bool,
) -> float:
    day_of_year = fecha.timetuple().tm_yday
    lng_hour = longitude / 15
    approx_time = day_of_year + ((6 - lng_hour) / 24 if is_sunrise else (18 - lng_hour) / 24)

    mean_anomaly = (0.9856 * approx_time) - 3.289
    true_longitude = _normalize_angle(
        mean_anomaly
        + (1.916 * sin(radians(mean_anomaly)))
        + (0.020 * sin(radians(2 * mean_anomaly)))
        + 282.634
    )

    right_ascension = degrees(atan(0.91764 * tan(radians(true_longitude))))
    right_ascension = _normalize_angle(right_ascension)

    true_longitude_quadrant = floor(true_longitude / 90) * 90
    right_ascension_quadrant = floor(right_ascension / 90) * 90
    right_ascension = (right_ascension + (true_longitude_quadrant - right_ascension_quadrant)) / 15

    sin_declination = 0.39782 * sin(radians(true_longitude))
    cos_declination = cos(asin(sin_declination))
    cos_local_hour = (
        cos(radians(90.833))
        - (sin_declination * sin(radians(latitude)))
    ) / (cos_declination * cos(radians(latitude)))

    if not -1 <= cos_local_hour <= 1:
        raise SunlightError("Sunlight calculation failed for the provided coordinates/date.")

    local_hour_angle = 360 - degrees(acos(cos_local_hour)) if is_sunrise else degrees(acos(cos_local_hour))
    local_hour_angle /= 15

    local_mean_time = local_hour_angle + right_ascension - (0.06571 * approx_time) - 6.622
    return (local_mean_time - lng_hour) % 24


def _calculate_sunrise_sunset_fallback(
    latitude: float,
    longitude: float,
    fecha: str,
    timezone_name: str,
) -> tuple[datetime, datetime]:
    target_date = date.fromisoformat(fecha)
    timezone_offset_hours = _resolve_timezone_offset_hours(target_date, timezone_name)

    sunrise_utc_hour = _calculate_solar_event_utc_hour(target_date, latitude, longitude, is_sunrise=True)
    sunset_utc_hour = _calculate_solar_event_utc_hour(target_date, latitude, longitude, is_sunrise=False)

    start_of_day_utc = datetime.combine(target_date, time.min)
    sunrise_local = start_of_day_utc + timedelta(hours=sunrise_utc_hour + timezone_offset_hours)
    sunset_local = start_of_day_utc + timedelta(hours=sunset_utc_hour + timezone_offset_hours)

    return (
        sunrise_local,
        sunset_local,
    )


def _last_sunday(year: int, month: int) -> date:
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    current = next_month - timedelta(days=1)
    while current.weekday() != 6:
        current -= timedelta(days=1)
    return current


def _is_western_europe_dst(target_date: date) -> bool:
    dst_start = _last_sunday(target_date.year, 3)
    dst_end = _last_sunday(target_date.year, 10)
    return dst_start <= target_date < dst_end


def _resolve_timezone_offset_hours(target_date: date, timezone_name: str) -> float:
    try:
        tz = ZoneInfo(timezone_name)
        local_dt = datetime.combine(target_date, time(hour=12), tzinfo=tz)
        offset = local_dt.utcoffset()
        return (offset or timedelta(0)).total_seconds() / 3600
    except ZoneInfoNotFoundError:
        if timezone_name == "Atlantic/Canary":
            return 1 if _is_western_europe_dst(target_date) else 0
        if timezone_name == "Europe/Madrid":
            return 2 if _is_western_europe_dst(target_date) else 1
        return 0


def _resolve_sunrise_sunset(
    latitude: float,
    longitude: float,
    fecha: str,
    timezone_name: str,
    timeout_seconds: int,
) -> tuple[datetime, datetime]:
    try:
        return _fetch_sunrise_sunset(
            latitude,
            longitude,
            fecha,
            timezone_name,
            timeout_seconds,
        )
    except SunlightError:
        return _calculate_sunrise_sunset_fallback(
            latitude,
            longitude,
            fecha,
            timezone_name,
        )


def obtener_aviso_luz_solar(
    actividad: str,
    playas: list[dict[str, Any]],
    fecha: str,
    hora: str,
    hora_fin: str | None,
    timezone: str,
    timeout_seconds: int,
) -> dict[str, Any] | None:
    if actividad != "tomar_sol" or not playas:
        return None

    latitud, longitud = (
        _obtener_coordenadas_representativas(
            playas
        )
    )

    sunrise_dt, sunset_dt = (
        _resolve_sunrise_sunset(
            latitud,
            longitud,
            fecha,
            timezone,
            timeout_seconds,
        )
    )

    hora_consulta = datetime.fromisoformat(f"{fecha}T{hora}")
    hora_fin_consulta = datetime.fromisoformat(f"{fecha}T{hora_fin}") if hora_fin else hora_consulta

    if hora_consulta < sunrise_dt:

        sunrise_text = _formatear_hora(
            sunrise_dt
        )

        return {
            "tipo": "antes_amanecer",
            "mensaje": f"A esa hora todavía no ha salido el sol. El sol saldrá a las {sunrise_text} horas",
            "bloqueante": True,
        }

    if hora_consulta >= sunset_dt:

        sunset_text = _formatear_hora(
            sunset_dt
        )

        return {
            "tipo": "despues_atardecer",
            "mensaje": f"El sol se pondrá a las {sunset_text} horas",
            "bloqueante": True,
        }

    if hora_fin and hora_fin_consulta > sunset_dt:
        sunset_text = _formatear_hora(sunset_dt)
        return {
            "tipo": "fin_despues_atardecer",
            "mensaje": (
                f"La hora de fin supera la puesta de sol. "
                f"A partir de las {sunset_text} horas ya no habrá sol."
            ),
            "bloqueante": False,
        }

    return None
