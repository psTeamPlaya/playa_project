from sqlalchemy import Boolean, Column, Integer, String
from backend.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
