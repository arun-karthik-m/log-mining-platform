"""Application settings and configuration."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Log Mining Intelligence Platform"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database (Neon)
    database_url: str = ""
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # Mining algorithms
    min_support: float = 0.1
    min_confidence: float = 0.5
    n_clusters: int = 5
    contamination: float = 0.1

    # Frontend
    frontend_url: str = "http://localhost:3000"

    @property
    def allowed_origins(self) -> list[str]:
        """Return list of allowed CORS origins."""
        return [self.frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance.

    Returns:
        Settings instance with loaded configuration.
    """
    return Settings()
