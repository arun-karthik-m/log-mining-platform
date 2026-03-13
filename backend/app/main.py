"""Main FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import log_routes, mining_routes
from app.config import get_settings
from app.database import db_connection
from utils.error_handlers import register_exception_handlers
from utils.logger import setup_logger

logger = setup_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan event handler."""
    # Startup
    logger.info("Initializing database connection")
    await db_connection.connect()
    yield
    # Shutdown
    logger.info("Closing database connection")
    await db_connection.disconnect()


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="Log Mining Intelligence Platform",
        description="AI-Powered Log Analytics with Pattern Mining, Clustering, and Anomaly Detection",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Register exception handlers
    register_exception_handlers(application)

    # Configure CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routes
    application.include_router(log_routes.router, prefix="/api/v1", tags=["logs"])
    application.include_router(mining_routes.router, prefix="/api/v1", tags=["mining"])

    return application


app = create_application()
