from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from backend.config import settings
from sqlalchemy.orm import declarative_base

Base = declarative_base()
engine = create_engine(settings.DATABASE_URL, future=True)

SessionLocal = sessionmaker(
    bind        =   engine,
    autoflush   =   False,
    autocommit  =   False,
    future      =   True
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False