import os  # Para trabajar con variables de entorno

from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = os.getenv("APP_NAME", "Mi día de Playa")
    APP_ENV = os.getenv("APP_ENV", "development")
    WEATHER_PROVIDER = os.getenv("WEATHER_PROVIDER", "openmeteo").lower()
    OPEN_METEO_TIMEZONE = os.getenv("OPEN_METEO_TIMEZONE", "Atlantic/Canary")
    OPEN_METEO_TIMEOUT_SECONDS = int(os.getenv("OPEN_METEO_TIMEOUT_SECONDS", "10"))
    ALERTS_ENABLED = os.getenv("ALERTS_ENABLED", "true").lower() == "true"
    ALERTS_INITIAL_DELAY_SECONDS = int(os.getenv("ALERTS_INITIAL_DELAY_SECONDS", "2"))
    ALERTS_POLL_SECONDS = int(os.getenv("ALERTS_POLL_SECONDS", "900"))
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    DATABASE_URL = os.getenv(
            "DATABASE_URL",
        )

    SECRET_KEY = os.getenv("SECRET_KEY")

settings = Settings()
