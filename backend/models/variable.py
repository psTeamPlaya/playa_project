from sqlalchemy import Column, Integer, String
from backend.db import Base

class Variable(Base):
    __tablename__ = "variables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    unit = Column(String, nullable=True)