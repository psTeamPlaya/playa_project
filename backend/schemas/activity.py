from pydantic import BaseModel

class ActivityResponse(BaseModel):
    name: str
    label: str
    icon: str | None = None

    class Config:
        from_attributes = True
