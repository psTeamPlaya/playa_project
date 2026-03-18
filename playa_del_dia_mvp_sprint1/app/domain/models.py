from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any


@dataclass(frozen=True)
class Activity:
    code: str
    label: str
    icon_path: str


@dataclass(frozen=True)
class Beach:
    id: int
    name: str
    municipality: str
    latitude: float
    longitude: float
    surface_type: str
    family_friendly: bool
    pet_friendly: bool
    food_nearby: bool
    has_surf_school: bool
    has_windsurf_school: bool
    has_sports_area: bool
    access_type: str
    default_air_temp_c: float
    default_water_temp_c: float
    default_wave_height_m: float
    default_wind_kmh: float
    default_cloud_cover_pct: float
    default_rain_probability_pct: float
    default_uv_index: float
    activity_compatibility: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class UserLocation:
    latitude: float
    longitude: float


@dataclass(frozen=True)
class RecommendationRequest:
    activity_code: str
    selected_date: date
    selected_hour: int
    user_location: UserLocation
    max_distance_km: float


@dataclass(frozen=True)
class DynamicConditions:
    air_temp_c: float | None
    water_temp_c: float | None
    wave_height_m: float | None
    wind_kmh: float | None
    cloud_cover_pct: float | None
    rain_probability_pct: float | None
    uv_index: float | None
    provider: str
    provider_time: str | None
    used_fallback: bool = False


@dataclass(frozen=True)
class RecommendationResult:
    rank: int
    beach_id: int
    beach_name: str
    municipality: str
    score: float
    distance_km: float
    explanation: list[str]
    static_features: dict[str, Any]
    dynamic_conditions: DynamicConditions


@dataclass(frozen=True)
class EvaluationTrace:
    beach_id: int
    distance_km: float
    discarded: bool
    discard_reason: str | None
    activity_fit: float
    conditions_fit: float
    distance_fit: float
    static_bonus: float
    total_score: float
