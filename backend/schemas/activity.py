from pydantic import BaseModel
from backend.models.activity import ActivityEnum

class ActivityCreate(BaseModel):
    name: ActivityEnum