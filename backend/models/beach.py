from sqlalchemy import Column, Integer, String, Text, Boolean, DECIMAL
from sqlalchemy.orm import declarative_base

# 'Base' de superclase indica a SQLAlchemy que la clase heredera es una tabla
Base = declarative_base()

class Beach(Base):
    __tablename__ = "beaches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    location = Column(String)
    description = Column(Text)
    type = Column(String)
    latitude = Column(DECIMAL, nullable=False)
    longitude = Column(DECIMAL, nullable=False)
    accessibility = Column(Boolean)
    image = Column(String)