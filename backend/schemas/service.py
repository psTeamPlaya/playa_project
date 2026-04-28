from pydantic import BaseModel

class ServiceCreate(BaseModel):
    name: str

class ServiceResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True
        
class ServiceUpdate(BaseModel):
    name: str