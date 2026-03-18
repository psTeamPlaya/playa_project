from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "app" / "presentation" / "static"
SQL_SCHEMA_PATH = BASE_DIR / "sql" / "schema.sql"


@dataclass(frozen=True)
class Settings:
    app_name: str = "La Playa del Día"
    app_version: str = "0.1.0"
    app_env: str = os.getenv("APP_ENV", "development")
    db_path: str = os.getenv("PLAYA_DB_PATH", str(BASE_DIR / "playa_del_dia.db"))
    open_meteo_timeout_seconds: float = float(os.getenv("OPEN_METEO_TIMEOUT_SECONDS", "8"))
    open_meteo_forecast_url: str = "https://api.open-meteo.com/v1/forecast"
    open_meteo_marine_url: str = "https://marine-api.open-meteo.com/v1/marine"


settings = Settings()
