from pydantic import BaseModel
from backend.models.activity import ActivityEnum

class ActivityCreate(BaseModel):
    name: ActivityEnum

class ActivityResponse(BaseModel):
    id: int
    name: ActivityEnum
    class Config:
        from_attributes = True

class ActivityUpdate(BaseModel):
    name: ActivityEnum