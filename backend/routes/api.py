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
        all_data = {}
        try:
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public';
                """))
                tables = [row[0] for row in result]
                for table in tables:
                    rows = conn.execute(text(f"SELECT * FROM {table}"))
                    all_data[table] = [dict(row._mapping) for row in rows]  # make dicts from rows
        except Exception as e:
            all_data[table] = {"error": str(e)}

    return {
        "status": "ok",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database_connected": database_connected,
        "tables": tables,
        "data": all_data
    }

