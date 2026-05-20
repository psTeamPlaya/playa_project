from datetime import datetime

from pydantic import BaseModel, Field


class UserAlertCreate(BaseModel):
    activity_name: str = Field(min_length=1)
    beach_id: int = Field(ge=1)
    filters: dict = Field(default_factory=dict)


class UserAlertResponse(BaseModel):
    id: int
    activity_name: str
    activity_label: str
    beach_id: int | None
    beach_label: str | None
    filters: dict
    is_active: bool
    last_notified_match: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
