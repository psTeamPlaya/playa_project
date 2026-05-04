from sqlalchemy import Column, Integer, Float, ForeignKey
from backend.db import Base

class ActivityVariableWeight(Base):
    __tablename__ = "activity_variable_weights"

    activity_id = Column(Integer, ForeignKey("activities.id"), primary_key=True)
    variable_id = Column(Integer, ForeignKey("variables.id"), primary_key=True)
    weight = Column(Float, nullable=False)