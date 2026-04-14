from fastapi import APIRouter

from backend.config import settings
from backend.db import check_database_connection

router = APIRouter(prefix="/api", tags=["API"])

@router.get("/health")
def health():
    database_connected = check_database_connection()
    return {
            "status": "ok",
            "app_name": settings.APP_NAME,
            "environment": settings.APP_ENV,
            "database_connected": database_connected,
    }

