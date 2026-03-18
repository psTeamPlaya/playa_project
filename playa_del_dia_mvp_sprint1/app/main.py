from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import STATIC_DIR, settings
from app.domain.models import RecommendationRequest, UserLocation
from app.domain.recommendation_service import RecommendationService
from app.infrastructure.db import BeachRepository, SQLiteDatabase
from app.infrastructure.open_meteo import OpenMeteoProvider
from app.presentation.schemas import (
    BeachResponse,
    RecommendationRequestPayload,
    RecommendationResponse,
)


database = SQLiteDatabase(settings.db_path)
repository = BeachRepository(database)
weather_provider = OpenMeteoProvider()
recommendation_service = RecommendationService(repository, weather_provider)


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize()
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(Path(STATIC_DIR) / "index.html")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}


@app.get("/api/v1/activities")
def list_activities() -> list[dict]:
    return [activity.__dict__ for activity in repository.list_activities()]


@app.get("/api/v1/beaches")
def list_beaches() -> list[BeachResponse]:
    beaches = repository.list_beaches()
    return [
        BeachResponse(
            id=beach.id,
            name=beach.name,
            municipality=beach.municipality,
            latitude=beach.latitude,
            longitude=beach.longitude,
            surface_type=beach.surface_type,
            family_friendly=beach.family_friendly,
            food_nearby=beach.food_nearby,
            access_type=beach.access_type,
        )
        for beach in beaches
    ]


@app.post("/api/v1/recommendations/top", response_model=RecommendationResponse)
async def top_recommendations(payload: RecommendationRequestPayload) -> RecommendationResponse:
    domain_request = RecommendationRequest(
        activity_code=payload.activity,
        selected_date=payload.selected_date,
        selected_hour=payload.selected_hour,
        user_location=UserLocation(
            latitude=payload.user_location.latitude,
            longitude=payload.user_location.longitude,
        ),
        max_distance_km=payload.max_distance_km,
    )

    recommendation_output = await recommendation_service.recommend_top_three(domain_request)
    return RecommendationResponse(
        algorithm_version=settings.app_version,
        query=payload,
        results=[
            {
                "rank": result.rank,
                "beach_id": result.beach_id,
                "beach_name": result.beach_name,
                "municipality": result.municipality,
                "score": result.score,
                "distance_km": result.distance_km,
                "explanation": result.explanation,
                "static_features": result.static_features,
                "dynamic_conditions": {
                    "air_temp_c": result.dynamic_conditions.air_temp_c,
                    "water_temp_c": result.dynamic_conditions.water_temp_c,
                    "wave_height_m": result.dynamic_conditions.wave_height_m,
                    "wind_kmh": result.dynamic_conditions.wind_kmh,
                    "cloud_cover_pct": result.dynamic_conditions.cloud_cover_pct,
                    "rain_probability_pct": result.dynamic_conditions.rain_probability_pct,
                    "uv_index": result.dynamic_conditions.uv_index,
                    "provider": result.dynamic_conditions.provider,
                    "provider_time": result.dynamic_conditions.provider_time,
                    "used_fallback": result.dynamic_conditions.used_fallback,
                },
            }
            for result in recommendation_output["results"]
        ],
        discarded_summary=recommendation_output["discarded_summary"],
        explanation_if_empty=recommendation_output["explanation_if_empty"],
    )
