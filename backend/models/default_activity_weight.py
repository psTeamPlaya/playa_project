from sqlalchemy import Column, Integer, Float, ForeignKey
from backend.db import Base

class DefaultActivityWeight(Base):
    __tablename__ = "default_activity_weights"

    activity_id = Column(Integer, ForeignKey("activities.id"), primary_key=True)
    weight = Column(Float, nullable=False)