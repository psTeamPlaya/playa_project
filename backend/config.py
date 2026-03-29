import os # Para trabajar con variables de entorno

class Settings:
    APP_NAME = os.getenv("APP_NAME", "Mi día de playa")
    APP_ENV = os.getenv("APP_ENV", "development")
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/mi-dia-de-playa"
    )

settings = Settings()

