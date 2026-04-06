from fastapi import FastAPI
from backend.config import settings
from backend.routes.api import router as api_router
from backend.routes.beaches import router as beaches_router

app = FastAPI(title=settings.APP_NAME)

# python -m uvicorn backend.main:app --reload

app.include_router(api_router)
app.include_router(tags=["Beaches"], prefix="/beaches", router=beaches_router)