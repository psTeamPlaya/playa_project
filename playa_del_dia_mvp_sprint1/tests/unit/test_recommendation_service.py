from __future__ import annotations

from datetime import date
import asyncio

from app.domain.models import Beach, DynamicConditions, RecommendationRequest, UserLocation
from app.domain.recommendation_service import RecommendationService


class FakeBeachRepository:
    def list_beaches(self) -> list[Beach]:
        return [
            Beach(
                id=1,
                name="Playa A",
                municipality="Zona A",
                latitude=28.1000,
                longitude=-15.4000,
                surface_type="sand",
                family_friendly=True,
                pet_friendly=False,
                food_nearby=True,
                has_surf_school=False,
                has_windsurf_school=False,
                has_sports_area=True,
                access_type="easy",
                default_air_temp_c=25,
                default_water_temp_c=22,
                default_wave_height_m=0.5,
                default_wind_kmh=10,
                default_cloud_cover_pct=15,
                default_rain_probability_pct=5,
                default_uv_index=7,
                activity_compatibility={"sunbathing": 0.95, "family_day": 0.90},
            ),
            Beach(
                id=2,
                name="Playa B",
                municipality="Zona B",
                latitude=28.1200,
                longitude=-15.4100,
                surface_type="stone",
                family_friendly=False,
                pet_friendly=False,
                food_nearby=False,
                has_surf_school=True,
                has_windsurf_school=False,
                has_sports_area=False,
                access_type="medium",
                default_air_temp_c=21,
                default_water_temp_c=20,
                default_wave_height_m=1.8,
                default_wind_kmh=22,
                default_cloud_cover_pct=40,
                default_rain_probability_pct=15,
                default_uv_index=6,
                activity_compatibility={"sunbathing": 0.20, "surf": 0.95},
            ),
        ]


class FakeWeatherProvider:
    async def fetch_conditions(self, beach: Beach, selected_date: date, selected_hour: int) -> DynamicConditions:
        if beach.id == 1:
            return DynamicConditions(
                air_temp_c=26,
                water_temp_c=22,
                wave_height_m=0.4,
                wind_kmh=9,
                cloud_cover_pct=10,
                rain_probability_pct=5,
                uv_index=7,
                provider="fake",
                provider_time=f"{selected_date.isoformat()}T{selected_hour:02d}:00",
                used_fallback=False,
            )
        return DynamicConditions(
            air_temp_c=21,
            water_temp_c=20,
            wave_height_m=1.8,
            wind_kmh=20,
            cloud_cover_pct=45,
            rain_probability_pct=15,
            uv_index=6,
            provider="fake",
            provider_time=f"{selected_date.isoformat()}T{selected_hour:02d}:00",
            used_fallback=False,
        )


def test_recommendation_service_returns_best_ranked_beach() -> None:
    service = RecommendationService(FakeBeachRepository(), FakeWeatherProvider())
    payload = RecommendationRequest(
        activity_code="sunbathing",
        selected_date=date(2026, 3, 20),
        selected_hour=12,
        user_location=UserLocation(latitude=28.1005, longitude=-15.4005),
        max_distance_km=30,
    )

    result = asyncio.run(service.recommend_top_three(payload))

    assert result["results"]
    assert result["results"][0].beach_name == "Playa A"
    assert result["results"][0].score > result["results"][1].score
