from sqlalchemy import Column, Integer, Float, ForeignKey
from backend.db import Base

class UserActivityPreference(Base):
    __tablename__ = "user_activity_preferences"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), primary_key=True)

    weight = Column(Float, nullable=False)