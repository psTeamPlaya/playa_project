from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

# 'Base' de superclase indica a SQLAlchemy que la clase heredera es una tabla
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)