from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import admin_leads, auth, health, leads, services

settings = get_settings()

app = FastAPI(
    title="UJ Global API",
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
    allow_credentials=True,
)

v1 = APIRouter(prefix="/v1")
v1.include_router(auth.router)
v1.include_router(services.router)
v1.include_router(leads.router)
v1.include_router(admin_leads.router)

app.include_router(health.router)
app.include_router(v1)
