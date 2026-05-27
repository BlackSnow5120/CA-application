import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.config import settings
from backend.routers import clients, tds, gst, itr, accounting, litigation, dashboard

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.file_storage_path, exist_ok=True)
    await init_db()
    logger.info("Database initialised. CA Firm Platform started.")
    yield
    # Shutdown
    logger.info("CA Firm Platform shutting down.")


app = FastAPI(
    title="CA Firm Compliance Platform",
    description="On-premises compliance management with local AI via Ollama",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(clients.router)
app.include_router(tds.router)
app.include_router(gst.router)
app.include_router(itr.router)
app.include_router(accounting.router)
app.include_router(litigation.router)


@app.get("/")
async def root():
    return {
        "app": "CA Firm Compliance Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "ai": f"Ollama at {settings.ollama_base_url} (model: {settings.ollama_model})",
    }
