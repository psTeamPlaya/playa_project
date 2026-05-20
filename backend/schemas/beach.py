from pydantic import BaseModel


class BeachOptionResponse(BaseModel):
    id: int
    name: str
    location: str | None
    label: str

    class Config:
        from_attributes = True
