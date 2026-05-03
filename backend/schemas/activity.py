from pydantic import BaseModel

class ActivityResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True