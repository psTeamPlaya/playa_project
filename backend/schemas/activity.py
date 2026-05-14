from pydantic import BaseModel

class ActivityResponse(BaseModel):
    name: str
    label: str

    class Config:
        from_attributes = True
