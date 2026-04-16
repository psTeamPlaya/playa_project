from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import declarative_base

# 'Base' de superclase indica a SQLAlchemy que la clase heredera es una tabla
Base = declarative_base()

class DefaultActivityWeight(Base):
    __tablename__ = "default_activity_weights"

    activity_id = Column(Integer, ForeignKey("activities.id"), primary_key=True)
    weight = Column(Float, nullable=False)