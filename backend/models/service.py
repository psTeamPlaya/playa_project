from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from backend.db import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)

    beaches = relationship("Beach", secondary="beach_services", back_populates="services")