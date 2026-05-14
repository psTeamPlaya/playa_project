from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String

from backend.db import Base


class UserAlert(Base):
    __tablename__ = "user_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_name = Column(String, nullable=False)
    filters = Column(JSON, nullable=False, default=dict)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radio_km = Column(Integer, nullable=False, default=50)
    location_label = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    last_notified_match = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
