"""Custom exceptions for the application."""

from typing import Any, Optional


class AppException(Exception):
    """Base exception for application errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        detail: Optional[str] = None,
    ) -> None:
        """Initialize exception.

        Args:
            message: Error message.
            status_code: HTTP status code.
            detail: Additional error details.
        """
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail


class DatabaseException(AppException):
    """Database operation error."""

    def __init__(self, message: str, detail: Optional[str] = None) -> None:
        super().__init__(message=message, status_code=500, detail=detail)


class ValidationException(AppException):
    """Data validation error."""

    def __init__(self, message: str, detail: Optional[str] = None) -> None:
        super().__init__(message=message, status_code=400, detail=detail)


class NotFoundException(AppException):
    """Resource not found error."""

    def __init__(self, message: str, detail: Optional[str] = None) -> None:
        super().__init__(message=message, status_code=404, detail=detail)


class MiningException(AppException):
    """Data mining operation error."""

    def __init__(self, message: str, detail: Optional[str] = None) -> None:
        super().__init__(message=message, status_code=500, detail=detail)


class ConfigurationException(AppException):
    """Configuration error."""

    def __init__(self, message: str, detail: Optional[str] = None) -> None:
        super().__init__(message=message, status_code=500, detail=detail)
