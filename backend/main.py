from fastapi import FastAPI
from backend.config import settings
from backend.routes.api import router as api_router

app = FastAPI(title=settings.APP_NAME)

app.include_router(api_router)

