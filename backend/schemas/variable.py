from pydantic import BaseModel
from typing import Optional

class VariableResponse(BaseModel):
    id: int
    name: str
    unit: Optional[str] = None

    class Config:
        from_attributes = True 