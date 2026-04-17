from sqlalchemy import Column, Integer, ForeignKey
from backend.db import Base

class UserFavoriteBeaches(Base):
    __tablename__ = "user_favorite_beaches"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    beach_id = Column(Integer, ForeignKey("beaches.id"), primary_key=True)