from sqlalchemy import create_engine, text  #  create_engine para crear la conexión con la db; text para ejecutar SQL escrito como texto
from sqlalchemy.orm import sessionmaker # Para crear sesiones de db para consultar tablas, insertar registros, actualizar datos,...

from backend.config import settings

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