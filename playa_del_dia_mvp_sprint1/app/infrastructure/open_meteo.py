from __future__ import annotations

from datetime import date
from typing import Any

import httpx

from app.config import settings
from app.domain.models import Beach, DynamicConditions


class OpenMeteoProvider:
    def __init__(self, timeout_seconds: float | None = None) -> None:
        self.timeout_seconds = timeout_seconds or settings.open_meteo_timeout_seconds

    async def fetch_conditions(
        self,
        beach: Beach,
        selected_date: date,
        selected_hour: int,
    ) -> DynamicConditions:
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                forecast_response, marine_response = await self._gather_requests(
                    client=client,
                    beach=beach,
                    selected_date=selected_date,
                )

            forecast_json = forecast_response.json()
            marine_json = marine_response.json()
            timestamp = f"{selected_date.isoformat()}T{selected_hour:02d}:00"

            return DynamicConditions(
                air_temp_c=self._extract_hourly_value(forecast_json, "temperature_2m", timestamp),
                water_temp_c=self._extract_hourly_value(marine_json, "sea_surface_temperature", timestamp),
                wave_height_m=self._extract_hourly_value(marine_json, "wave_height", timestamp),
                wind_kmh=self._extract_hourly_value(forecast_json, "wind_speed_10m", timestamp),
                cloud_cover_pct=self._extract_hourly_value(forecast_json, "cloud_cover", timestamp),
                rain_probability_pct=self._extract_hourly_value(
                    forecast_json,
                    "precipitation_probability",
                    timestamp,
                ),
                uv_index=self._extract_hourly_value(forecast_json, "uv_index", timestamp),
                provider="open-meteo",
                provider_time=timestamp,
                used_fallback=False,
            )
        except Exception:
            return self._fallback(beach, selected_date, selected_hour)

    async def _gather_requests(
        self,
        client: httpx.AsyncClient,
        beach: Beach,
        selected_date: date,
    ) -> tuple[httpx.Response, httpx.Response]:
        common_params = {
            "latitude": beach.latitude,
            "longitude": beach.longitude,
            "start_date": selected_date.isoformat(),
            "end_date": selected_date.isoformat(),
            "timezone": "UTC",
        }

        forecast_params = {
            **common_params,
            "hourly": ",".join(
                [
                    "temperature_2m",
                    "precipitation_probability",
                    "cloud_cover",
                    "wind_speed_10m",
                    "uv_index",
                ]
            ),
        }
        marine_params = {
            **common_params,
            "hourly": ",".join(["wave_height", "sea_surface_temperature"]),
        }

        forecast_request = client.get(settings.open_meteo_forecast_url, params=forecast_params)
        marine_request = client.get(settings.open_meteo_marine_url, params=marine_params)
        forecast_response, marine_response = await forecast_request, await marine_request
        forecast_response.raise_for_status()
        marine_response.raise_for_status()
        return forecast_response, marine_response

    def _extract_hourly_value(
        self,
        payload: dict[str, Any],
        field_name: str,
        timestamp: str,
    ) -> float | None:
        hourly = payload.get("hourly") or {}
        timestamps = hourly.get("time") or []
        values = hourly.get(field_name) or []
        if not timestamps or not values:
            return None
        try:
            index = timestamps.index(timestamp)
        except ValueError:
            return None
        value = values[index]
        if value is None:
            return None
        return float(value)

    def _fallback(self, beach: Beach, selected_date: date, selected_hour: int) -> DynamicConditions:
        return DynamicConditions(
            air_temp_c=beach.default_air_temp_c,
            water_temp_c=beach.default_water_temp_c,
            wave_height_m=beach.default_wave_height_m,
            wind_kmh=beach.default_wind_kmh,
            cloud_cover_pct=beach.default_cloud_cover_pct,
            rain_probability_pct=beach.default_rain_probability_pct,
            uv_index=beach.default_uv_index,
            provider="fallback-defaults",
            provider_time=f"{selected_date.isoformat()}T{selected_hour:02d}:00",
            used_fallback=True,
        )
