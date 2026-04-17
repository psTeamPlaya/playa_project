from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import declarative_base

# 'Base' de superclase indica a SQLAlchemy que la clase heredera es una tabla
Base = declarative_base()

class UserFavoriteBeaches(Base):
    __tablename__ = "user_favorite_beaches"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    beach_id = Column(Integer, ForeignKey("beaches.id"), primary_key=True)