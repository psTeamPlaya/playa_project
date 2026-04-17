import os # Para trabajar con variables de entorno
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = os.getenv("APP_NAME", "Mi día de Playa")
    APP_ENV = os.getenv("APP_ENV", "development")
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/mi-dia-de-playa"
    )
    SECRET_KEY = os.getenv("SECRET_KEY")

settings = Settings()

