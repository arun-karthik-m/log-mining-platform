"""Exception handlers for FastAPI application."""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from utils.exceptions import (
    AppException,
    ConfigurationException,
    DatabaseException,
    MiningException,
    NotFoundException,
    ValidationException,
)
from utils.logger import setup_logger

logger = setup_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers.

    Args:
        app: FastAPI application instance.
    """

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """Handle request validation errors.

        Args:
            request: HTTP request.
            exc: Validation exception.

        Returns:
            JSON response with error details.
        """
        logger.warning(f"Validation error: {exc.errors()}")

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": "Validation Error",
                "details": exc.errors(),
            },
        )

    @app.exception_handler(ValidationException)
    async def validation_app_exception_handler(
        request: Request,
        exc: ValidationException,
    ) -> JSONResponse:
        """Handle validation exceptions.

        Args:
            request: HTTP request.
            exc: Validation exception.

        Returns:
            JSON response.
        """
        logger.warning(f"Validation exception: {exc.message}")

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": "Validation Error",
                "message": exc.message,
                "detail": exc.detail,
            },
        )

    @app.exception_handler(NotFoundException)
    async def not_found_exception_handler(
        request: Request,
        exc: NotFoundException,
    ) -> JSONResponse:
        """Handle not found exceptions.

        Args:
            request: HTTP request.
            exc: Not found exception.

        Returns:
            JSON response.
        """
        logger.info(f"Not found: {exc.message}")

        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "success": False,
                "error": "Not Found",
                "message": exc.message,
                "detail": exc.detail,
            },
        )

    @app.exception_handler(DatabaseException)
    async def database_exception_handler(
        request: Request,
        exc: DatabaseException,
    ) -> JSONResponse:
        """Handle database exceptions.

        Args:
            request: HTTP request.
            exc: Database exception.

        Returns:
            JSON response.
        """
        logger.error(f"Database error: {exc.message}")

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Database Error",
                "message": "An internal database error occurred",
                "detail": exc.detail if exc.detail else None,
            },
        )

    @app.exception_handler(MiningException)
    async def mining_exception_handler(
        request: Request,
        exc: MiningException,
    ) -> JSONResponse:
        """Handle mining exceptions.

        Args:
            request: HTTP request.
            exc: Mining exception.

        Returns:
            JSON response.
        """
        logger.error(f"Mining error: {exc.message}")

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Mining Error",
                "message": exc.message,
                "detail": exc.detail,
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(
        request: Request,
        exc: SQLAlchemyError,
    ) -> JSONResponse:
        """Handle SQLAlchemy errors.

        Args:
            request: HTTP request.
            exc: SQLAlchemy error.

        Returns:
            JSON response.
        """
        logger.error(f"SQLAlchemy error: {str(exc)}")

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Database Error",
                "message": "A database error occurred",
            },
        )

    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request,
        exc: AppException,
    ) -> JSONResponse:
        """Handle generic application exceptions.

        Args:
            request: HTTP request.
            exc: Application exception.

        Returns:
            JSON response.
        """
        logger.error(f"App exception: {exc.message}")

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": "Application Error",
                "message": exc.message,
                "detail": exc.detail,
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """Handle unhandled exceptions.

        Args:
            request: HTTP request.
            exc: Generic exception.

        Returns:
            JSON response.
        """
        logger.exception(f"Unhandled exception: {str(exc)}")

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Internal Server Error",
                "message": "An unexpected error occurred",
            },
        )
