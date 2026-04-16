from fastapi import APIRouter
from sqlalchemy import text

from backend.config import settings
from backend.db import check_database_connection, engine

router = APIRouter(prefix="/api", tags=["API"])

@router.get("/health")
def health():
    database_connected = check_database_connection()

    tables = []
    if database_connected:
        try:
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public';
                """))
                tables = [row[0] for row in result]
        except Exception:
            tables = ["error"]

    return {
        "status": "ok",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database_connected": database_connected,
        "tables": tables,
    }

