"""Main FastAPI application entry point."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api import log_routes, mining_routes
from app.config import get_settings
from app.database import db_connection
from app.websocket import ws_manager
from utils.error_handlers import register_exception_handlers
from utils.logger import setup_logger

logger = setup_logger(__name__)
settings = get_settings()


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="Log Mining Intelligence Platform",
        description="AI-Powered Log Analytics with Pattern Mining, Clustering, and Anomaly Detection",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
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

    # WebSocket endpoint for live log streaming
    @application.websocket("/ws/logs")
    async def websocket_logs(websocket: WebSocket) -> None:
        """WebSocket endpoint for streaming logs in real-time."""
        await ws_manager.connect(websocket)
        try:
            while True:
                # Keep connection alive, listen for client messages (e.g. ping)
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket)
        except Exception:
            ws_manager.disconnect(websocket)

    # Lifecycle events
    @application.on_event("startup")
    async def startup_db_client() -> None:
        """Initialize database connection on startup."""
        logger.info("Initializing database connection")
        await db_connection.connect()

    @application.on_event("shutdown")
    async def shutdown_db_client() -> None:
        """Close database connection on shutdown."""
        logger.info("Closing database connection")
        await db_connection.disconnect()

    return application


app = create_application()
