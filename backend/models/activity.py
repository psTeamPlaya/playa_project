from sqlalchemy import Column, Integer, Enum
from sqlalchemy.orm import declarative_base

# 'Base' de superclase indica a SQLAlchemy que la clase heredera es una tabla
Base = declarative_base()

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Enum('sunbathing', 
                       'surf', 
                       'windsurf', 
                       'paddlesurf', 
                       'kayak'
                       ), nullable=False, unique=True)