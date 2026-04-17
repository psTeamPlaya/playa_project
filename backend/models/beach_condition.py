from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Enum, UniqueConstraint
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
    sea_level = Column(Float)

    tide_type = Column(Enum("low", "medium", "high"))

    # Para no poner duplicados
    __table_args__ = (
        UniqueConstraint("beach_id", "datetime"),
    )