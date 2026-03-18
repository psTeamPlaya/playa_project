from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient

from app.domain.models import Beach, DynamicConditions
from app.main import app, recommendation_service


class FakeWeatherProvider:
    async def fetch_conditions(self, beach: Beach, selected_date: date, selected_hour: int) -> DynamicConditions:
        return DynamicConditions(
            air_temp_c=25,
            water_temp_c=22,
            wave_height_m=0.8,
            wind_kmh=12,
            cloud_cover_pct=20,
            rain_probability_pct=10,
            uv_index=7,
            provider="fake",
            provider_time=f"{selected_date.isoformat()}T{selected_hour:02d}:00",
            used_fallback=False,
        )


def test_top_recommendations_endpoint_returns_payload() -> None:
    recommendation_service.weather_provider = FakeWeatherProvider()

    with TestClient(app) as client:
        payload = {
            "activity": "sunbathing",
            "selected_date": "2026-03-20",
            "selected_hour": 11,
            "user_location": {"latitude": 28.1200, "longitude": -15.4300},
            "max_distance_km": 80,
        }
        response = client.post("/api/v1/recommendations/top", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) >= 1
    assert data["results"][0]["beach_name"]
