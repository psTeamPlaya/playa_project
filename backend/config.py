import os # Para trabajar con variables de entorno
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = os.getenv("APP_NAME", "Mi día de Playa")
    APP_ENV = os.getenv("APP_ENV", "development")
    WEATHER_PROVIDER = os.getenv("WEATHER_PROVIDER", "openmeteo").lower()
    OPEN_METEO_TIMEZONE = os.getenv("OPEN_METEO_TIMEZONE", "Atlantic/Canary")
    OPEN_METEO_TIMEOUT_SECONDS = int(os.getenv("OPEN_METEO_TIMEOUT_SECONDS", "10"))
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/playas_db",
    )
    SECRET_KEY = os.getenv("SECRET_KEY")


settings = Settings()
