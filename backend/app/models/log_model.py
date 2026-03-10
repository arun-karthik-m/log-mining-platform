"""SQLAlchemy models for log mining platform."""


from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from app.database.db_connection import Base


class Log(Base):
    """Represents a parsed log entry."""

    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    level = Column(String(20), nullable=False, index=True)
    message = Column(Text, nullable=False)
    source = Column(String(100), nullable=True)
    session_id = Column(BigInteger, ForeignKey("sessions.id"), nullable=True, index=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_logs_timestamp_level", "timestamp", "level"),
        Index("ix_logs_source", "source"),
    )

    def __repr__(self) -> str:
        """Return string representation of the log."""
        return f"<Log(id={self.id}, level={self.level}, timestamp={self.timestamp})>"


class Session(Base):
    """Represents a log session (grouped related logs)."""

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_key = Column(String(255), unique=True, nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    event_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        """Return string representation of the session."""
        return f"<Session(id={self.id}, session_key={self.session_key})>"


class Pattern(Base):
    """Represents a discovered frequent pattern."""

    __tablename__ = "patterns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pattern_sequence = Column(ARRAY(String), nullable=False)
    support = Column(Float, nullable=False)
    confidence = Column(Float, nullable=True)
    frequency = Column(Integer, nullable=False)
    discovered_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        """Return string representation of the pattern."""
        return f"<Pattern(id={self.id}, support={self.support})>"


class Anomaly(Base):
    """Represents a detected anomaly."""

    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    anomaly_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    metadata_ = Column("metadata", JSONB, nullable=True)

    def __repr__(self) -> str:
        """Return string representation of the anomaly."""
        return f"<Anomaly(id={self.id}, type={self.anomaly_type}, severity={self.severity})>"


class Cluster(Base):
    """Represents a log cluster."""

    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cluster_name = Column(String(100), nullable=False)
    centroid_vector = Column(ARRAY(Float), nullable=True)
    log_count = Column(Integer, default=0)
    keywords = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        """Return string representation of the cluster."""
        return f"<Cluster(id={self.id}, name={self.cluster_name})>"
