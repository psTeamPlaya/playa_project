from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


SupportedActivity = Literal[
    "sunbathing",
    "surf",
    "windsurf",
    "diving",
    "family_day",
    "beach_sports",
]


class UserLocationPayload(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class RecommendationRequestPayload(BaseModel):
    activity: SupportedActivity
    selected_date: date
    selected_hour: int = Field(..., ge=0, le=23)
    user_location: UserLocationPayload
    max_distance_km: float = Field(..., gt=0, le=200)

    @field_validator("selected_date")
    @classmethod
    def selected_date_must_exist(cls, value: date) -> date:
        return value


class ActivityResponse(BaseModel):
    code: str
    label: str
    icon_path: str


class BeachResponse(BaseModel):
    id: int
    name: str
    municipality: str
    latitude: float
    longitude: float
    surface_type: str
    family_friendly: bool
    food_nearby: bool
    access_type: str


class DynamicConditionsResponse(BaseModel):
    air_temp_c: float | None
    water_temp_c: float | None
    wave_height_m: float | None
    wind_kmh: float | None
    cloud_cover_pct: float | None
    rain_probability_pct: float | None
    uv_index: float | None
    provider: str
    provider_time: str | None
    used_fallback: bool


class RecommendationResultResponse(BaseModel):
    rank: int
    beach_id: int
    beach_name: str
    municipality: str
    score: float
    distance_km: float
    explanation: list[str]
    static_features: dict
    dynamic_conditions: DynamicConditionsResponse


class RecommendationResponse(BaseModel):
    algorithm_version: str
    query: RecommendationRequestPayload
    results: list[RecommendationResultResponse]
    discarded_summary: dict
    explanation_if_empty: str | None
