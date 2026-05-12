from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    is_admin: bool
    is_banned: bool

    class Config:
        from_attributes = True


class UserAuditLogResponse(BaseModel):
    id: int
    action: str
    target_user_id: int | None
    target_email: str
    actor_user_id: int | None
    actor_email: str | None
    created_at: datetime

    class Config:
        from_attributes = True
