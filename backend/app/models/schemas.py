"""Pydantic models for request/response validation."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class LogBase(BaseModel):
    """Base schema for log data."""

    timestamp: datetime
    level: str = Field(..., min_length=1, max_length=20)
    message: str = Field(..., min_length=1)
    source: Optional[str] = Field(None, max_length=100)
    metadata: Optional[dict[str, Any]] = None


class LogCreate(LogBase):
    """Schema for creating a new log entry."""

    pass


class LogResponse(BaseModel):
    """Schema for log response with all fields."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    timestamp: datetime
    level: str
    message: str
    source: Optional[str] = None
    metadata: Optional[dict[str, Any]] = Field(None, validation_alias="metadata_")
    session_id: Optional[int] = None
    created_at: datetime


class LogList(BaseModel):
    """Schema for paginated log list response."""

    logs: list[LogResponse]
    total: int
    page: int
    limit: int


class SessionBase(BaseModel):
    """Base schema for session data."""

    session_key: str = Field(..., min_length=1, max_length=255)
    start_time: datetime


class SessionCreate(SessionBase):
    """Schema for creating a new session."""

    end_time: Optional[datetime] = None
    event_count: int = 0


class SessionResponse(SessionBase):
    """Schema for session response with all fields."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    end_time: Optional[datetime] = None
    event_count: int
    created_at: datetime


class PatternBase(BaseModel):
    """Base schema for pattern data."""

    pattern_sequence: list[str]
    support: float = Field(..., ge=0, le=1)
    confidence: Optional[float] = Field(None, ge=0, le=1)
    frequency: int = Field(..., ge=0)


class PatternResponse(PatternBase):
    """Schema for pattern response with all fields."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    discovered_at: datetime


class AnomalyBase(BaseModel):
    """Base schema for anomaly data."""

    anomaly_type: str = Field(..., max_length=50)
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    description: str = Field(..., min_length=1)
    metadata: Optional[dict[str, Any]] = None


class AnomalyResponse(BaseModel):
    """Schema for anomaly response with all fields."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    anomaly_type: str
    severity: str
    description: str
    metadata: Optional[dict[str, Any]] = Field(None, validation_alias="metadata_")
    detected_at: datetime


class ClusterBase(BaseModel):
    """Base schema for cluster data."""

    cluster_name: str = Field(..., max_length=100)
    log_count: int = Field(..., ge=0)
    keywords: Optional[list[str]] = None


class ClusterResponse(ClusterBase):
    """Schema for cluster response with all fields."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    centroid_vector: Optional[list[float]] = None
    created_at: datetime


class HourlyActivity(BaseModel):
    """Hourly log activity data point."""

    hour: str
    logs: int
    errors: int


class MetricsResponse(BaseModel):
    """Schema for dashboard metrics response."""

    total_logs: int
    total_sessions: int
    total_patterns: int
    total_anomalies: int
    error_rate: float
    logs_by_level: dict[str, int]
    hourly_activity: list[HourlyActivity] = []


class UploadResponse(BaseModel):
    """Schema for log upload response."""

    count: int
    success: bool = True


class HealthResponse(BaseModel):
    """Schema for health check response."""

    status: str
    database: bool
