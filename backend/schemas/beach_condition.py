from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional

class BeachConditionsCreate(BaseModel):
    beach_id: int = Field(..., gt=0)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    date: date

class BeachConditionResponse(BaseModel):
    id: int
    beach_id: int
    datetime: datetime

    air_temp: Optional[float] = None
    wind_speed: Optional[float] = None
    wave_height: Optional[float] = None
    water_temp: Optional[float] = None
    cloud_cover: Optional[int] = None
    rain_probability: Optional[int] = None
    tide: Optional[float] = None
    uv_index: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)