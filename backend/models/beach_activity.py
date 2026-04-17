from sqlalchemy import Column, Integer, DECIMAL, ForeignKey
from backend.db import Base

class BeachActivity(Base):
    __tablename__ = "beach_activities"

    beach_id = Column(Integer, ForeignKey("beaches.id"), primary_key=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), primary_key=True)

    score = Column(DECIMAL, nullable=False)