from pydantic import BaseModel, Field
from typing import Optional

class ReviewCreate(BaseModel):
    beach_id: int
    rating: int = Field(ge=1, le=5)
    content: Optional[str] = None
    

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    content: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    user_id: int
    email: str
    beach_id: int
    rating: int
    content: Optional[str]

    class Config:
        from_attributes = True