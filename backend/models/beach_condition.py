from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, UniqueConstraint
from backend.db import Base

class BeachCondition(Base):
    __tablename__ = "beach_conditions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    beach_id = Column(Integer, ForeignKey("beaches.id"), nullable=False)
    datetime = Column(DateTime, nullable=False)

    air_temp = Column(Float)
    wind_speed = Column(Float)
    wave_height = Column(Float)
    water_temp = Column(Float)
    cloud_cover = Column(Integer)
    rain_probability = Column(Integer)
    tide = Column(Float)
    uv_index = Column(Float)

    # Para no poner duplicados
    __table_args__ = (
        UniqueConstraint("beach_id", "datetime"),
    )