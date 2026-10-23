from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import ratelimit
from app.core.config import get_settings
from app.routers import admin_content, admin_leads, auth, case_studies, health, leads, services
from app.workers.queue import close_queue

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await close_queue()
    await ratelimit.close()


# The interactive docs and the machine-readable schema map every endpoint, so they're only served on a
# developer's machine, never on staging or production.
_show_docs = settings.environment in {"local", "test"}

app = FastAPI(
    lifespan=lifespan,
    title="UJ Global API",
    version="0.1.0",
    docs_url="/docs" if _show_docs else None,
    redoc_url=None,
    openapi_url="/openapi.json" if _show_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    allow_credentials=True,
)

v1 = APIRouter(prefix="/v1")
v1.include_router(auth.router)
v1.include_router(services.router)
v1.include_router(case_studies.router)
v1.include_router(leads.router)
v1.include_router(admin_leads.router)
v1.include_router(admin_content.router)

app.include_router(health.router)
app.include_router(v1)
