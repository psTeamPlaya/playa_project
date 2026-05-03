from pydantic import BaseModel

class ActivityVariableWeightResponse(BaseModel):
    activity_id: int
    variable_id: int
    weight: float
    class Config:
        from_attributes = True