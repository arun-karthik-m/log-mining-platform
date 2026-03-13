"""Database connection and session management for Neon PostgreSQL."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


class DatabaseConnection:
    """Manages database connection and session factory."""

    def __init__(self) -> None:
        """Initialize database connection parameters."""
        self._engine = None
        self._async_session_maker = None
        self._settings = get_settings()
        self._test_mode = False

    def set_test_mode(self, use_sqlite: bool = True) -> None:
        """Set database to test mode with SQLite.

        Args:
            use_sqlite: Whether to use SQLite for testing.
        """
        self._test_mode = True
        if use_sqlite:
            self._settings.database_url = "sqlite+aiosqlite:///:memory:"

    async def connect(self) -> None:
        """Create database engine and session factory."""
        if not self._settings.database_url and not self._test_mode:
            logger.error("DATABASE_URL not configured")
            raise ValueError("DATABASE_URL environment variable is required")

        db_url = self._settings.database_url or "sqlite+aiosqlite:///:memory:"
        is_sqlite = "sqlite" in db_url
        is_postgresql = "postgresql" in db_url

        logger.info(f"Connecting to database: {db_url[:40]}...")

        # SQLite doesn't support pool_size and max_overflow
        if is_sqlite:
            self._engine = create_async_engine(
                db_url,
                connect_args={"check_same_thread": False},
                echo=self._settings.debug,
            )
        elif is_postgresql:
            # PostgreSQL with SSL support for Neon
            # Disable prepared statement cache to avoid issues after schema changes
            # Use SSL only for remote connections (Neon), not for localhost
            is_localhost = "localhost" in db_url or "127.0.0.1" in db_url
            ssl_config = {} if is_localhost else {"ssl": "require"}
            
            self._engine = create_async_engine(
                db_url,
                pool_size=self._settings.db_pool_size,
                max_overflow=self._settings.db_max_overflow,
                pool_pre_ping=True,
                echo=self._settings.debug,
                connect_args={
                    **ssl_config,
                    "prepared_statement_cache_size": 0,
                },
            )
        else:
            self._engine = create_async_engine(
                db_url,
                echo=self._settings.debug,
            )

        self._async_session_maker = async_sessionmaker(
            self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

        logger.info("Database connection established")

    async def disconnect(self) -> None:
        """Close database connection."""
        if self._engine:
            logger.info("Closing database connection")
            await self._engine.dispose()
            self._engine = None
            self._async_session_maker = None

    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Yield database session for dependency injection.

        Yields:
            AsyncSession: SQLAlchemy async session.
        """
        if not self._async_session_maker:
            logger.error("Database not connected")
            raise RuntimeError("Database not connected. Call connect() first.")

        async with self._async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def health_check(self) -> bool:
        """Check database connection health.

        Returns:
            bool: True if database is healthy, False otherwise.
        """
        if not self._engine:
            return False

        try:
            async with self._engine.connect() as conn:
                await conn.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


# Global database connection instance
db_connection = DatabaseConnection()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session for FastAPI dependency injection.

    Yields:
        AsyncSession: SQLAlchemy async session.
    """
    async for session in db_connection.get_session():
        yield session
