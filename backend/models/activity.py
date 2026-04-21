from sqlalchemy import Column, Integer, Enum as SQLAlchemyEnum
from backend.db import Base
from enum import Enum

class ActivityEnum(str, Enum):
    sunbathing = "sunbathing"
    surf = "surf"
    windsurf = "windsurf"
    paddlesurf = "paddlesurf"
    kayak = "kayak"

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(SQLAlchemyEnum(ActivityEnum, name="activity_enum"), nullable=False, unique=True)
