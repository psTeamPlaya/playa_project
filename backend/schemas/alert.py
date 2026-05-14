from datetime import datetime

from pydantic import BaseModel, Field


class UserAlertCreate(BaseModel):
    activity_name: str = Field(min_length=1)
    filters: dict = Field(default_factory=dict)
    latitude: float
    longitude: float
    radio_km: int = Field(default=50, ge=1, le=200)
    location_label: str | None = None


class UserAlertResponse(BaseModel):
    id: int
    activity_name: str
    activity_label: str
    filters: dict
    latitude: float
    longitude: float
    radio_km: int
    location_label: str | None
    is_active: bool
    last_notified_match: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
