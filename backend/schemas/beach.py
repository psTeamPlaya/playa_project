from pydantic import BaseModel
from typing import Optional

class BeachCreate(BaseModel):
    name: str
    location: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    latitude: float
    longitude: float
    accessibility: Optional[bool] = False
    image: Optional[str] = None