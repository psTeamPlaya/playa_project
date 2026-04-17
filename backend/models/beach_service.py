from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import declarative_base

# 'Base' de superclase indica a SQLAlchemy que la clase heredera es una tabla
Base = declarative_base()

class BeachService(Base):
    __tablename__ = "beach_services"

    beach_id = Column(Integer, ForeignKey("beaches.id"), primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id"), primary_key=True)