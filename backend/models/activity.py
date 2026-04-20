from sqlalchemy import Column, Integer, Enum
from backend.db import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Enum('sunbathing', 
                       'surf', 
                       'windsurf', 
                       'paddlesurf', 
                       'kayak',
                        name="activity_enum"), nullable=False, unique=True)