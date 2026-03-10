"""Mining service layer for data mining operations.

Handles:
- Pattern discovery
- Log clustering
- Anomaly detection
- Results persistence
"""

from datetime import datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.log_model import Anomaly, Cluster, Log, Pattern
from app.mining.anomaly_detection import (
    detect_anomalies,
    detect_error_rate_anomalies,
    detect_volume_spikes,
    format_anomaly_for_storage,
)
from app.mining.clustering import cluster_logs
from app.mining.pattern_mining import extract_event_sequences, mine_frequent_patterns
from utils.logger import setup_logger

logger = setup_logger(__name__)


class MiningService:
    """Service for data mining operations."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize mining service.

        Args:
            db_session: SQLAlchemy async session.
        """
        self.db = db_session

    async def discover_patterns(
        self,
        min_support: float = 0.1,
        min_confidence: float = 0.5,
    ) -> int:
        """Discover frequent patterns in logs.

        Args:
            min_support: Minimum support threshold.
            min_confidence: Minimum confidence threshold.

        Returns:
            Number of patterns discovered.
        """
        logger.info("Starting pattern discovery")

        # Get all logs
        query = select(Log)
        result = await self.db.execute(query)
        logs = result.scalars().all()

        if not logs:
            logger.warning("No logs available for pattern mining")
            return 0

        # Convert SQLAlchemy models to dicts
        log_dicts = [self._log_to_dict(log) for log in logs]

        # Extract event sequences
        sequences = extract_event_sequences(log_dicts)

        if not sequences:
            logger.warning("No event sequences extracted")
            return 0

        # Mine patterns
        patterns, rules = mine_frequent_patterns(
            sequences,
            min_support=min_support,
            min_confidence=min_confidence,
        )

        # Clear existing patterns
        await self.db.execute(delete(Pattern))

        # Save new patterns
        saved_count = 0
        for pattern in patterns:
            pattern_model = Pattern(
                pattern_sequence=pattern["items"],
                support=pattern["support"],
                confidence=pattern.get("confidence"),
                frequency=pattern.get("frequency", 0),
            )
            self.db.add(pattern_model)
            saved_count += 1

        await self.db.flush()

        logger.info(f"Discovered {saved_count} patterns")
        return saved_count

    async def cluster_logs(self, n_clusters: int = 5) -> int:
        """Cluster logs into groups.

        Args:
            n_clusters: Number of clusters.

        Returns:
            Number of clusters created.
        """
        logger.info(f"Starting log clustering with k={n_clusters}")

        # Get all logs
        query = select(Log)
        result = await self.db.execute(query)
        logs = result.scalars().all()

        if not logs:
            logger.warning("No logs available for clustering")
            return 0

        # Convert to dicts
        log_dicts = [self._log_to_dict(log) for log in logs]

        # Perform clustering
        clusters = cluster_logs(log_dicts, n_clusters=n_clusters)

        # Clear existing clusters
        await self.db.execute(delete(Cluster))

        # Save new clusters
        saved_count = 0
        for cluster in clusters:
            cluster_model = Cluster(
                cluster_name=cluster["cluster_name"],
                log_count=cluster["log_count"],
                keywords=cluster.get("keywords"),
                centroid_vector=cluster.get("centroid_vector"),
            )
            self.db.add(cluster_model)
            saved_count += 1

        await self.db.flush()

        logger.info(f"Created {saved_count} clusters")
        return saved_count

    async def detect_anomalies_task(
        self,
        contamination: float = 0.1,
    ) -> int:
        """Detect anomalies in logs.

        Args:
            contamination: Expected proportion of anomalies.

        Returns:
            Number of anomalies detected.
        """
        logger.info("Starting anomaly detection")

        # Get all logs
        query = select(Log)
        result = await self.db.execute(query)
        logs = result.scalars().all()

        if not logs:
            logger.warning("No logs available for anomaly detection")
            return 0

        # Convert to dicts
        log_dicts = [self._log_to_dict(log) for log in logs]

        anomalies = []

        # Run Isolation Forest detection
        iso_anomalies = detect_anomalies(log_dicts, contamination=contamination)
        for anomaly in iso_anomalies:
            formatted = format_anomaly_for_storage(anomaly)
            anomalies.append(formatted)

        # Run volume spike detection
        volume_spikes = detect_volume_spikes(log_dicts)
        for spike in volume_spikes:
            formatted = format_anomaly_for_storage(spike)
            anomalies.append(formatted)

        # Run error rate detection
        error_anomalies = detect_error_rate_anomalies(log_dicts)
        for error in error_anomalies:
            formatted = format_anomaly_for_storage(error)
            anomalies.append(formatted)

        # Clear existing anomalies
        await self.db.execute(delete(Anomaly))

        # Save new anomalies
        saved_count = 0
        for anomaly in anomalies:
            anomaly_model = Anomaly(
                anomaly_type=anomaly["anomaly_type"],
                severity=anomaly["severity"],
                description=anomaly["description"],
                detected_at=anomaly.get("detected_at", datetime.now()),
                metadata_=anomaly.get("metadata"),
            )
            self.db.add(anomaly_model)
            saved_count += 1

        await self.db.flush()

        logger.info(f"Detected {saved_count} anomalies")
        return saved_count

    async def get_patterns(self) -> list[Pattern]:
        """Get all discovered patterns.

        Returns:
            List of patterns.
        """
        query = select(Pattern).order_by(Pattern.support.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_clusters(self) -> list[Cluster]:
        """Get all clusters.

        Returns:
            List of clusters.
        """
        query = select(Cluster).order_by(Cluster.log_count.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_anomalies(self) -> list[Anomaly]:
        """Get all detected anomalies.

        Returns:
            List of anomalies.
        """
        query = select(Anomaly).order_by(Anomaly.detected_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_mining_metrics(self) -> dict[str, Any]:
        """Get mining metrics.

        Returns:
            Dictionary with mining metrics.
        """
        from sqlalchemy import func

        # Count patterns
        patterns_query = select(func.count(Pattern.id))
        patterns_result = await self.db.execute(patterns_query)
        total_patterns = patterns_result.scalar() or 0

        # Count clusters
        clusters_query = select(func.count(Cluster.id))
        clusters_result = await self.db.execute(clusters_query)
        total_clusters = clusters_result.scalar() or 0

        # Count anomalies
        anomalies_query = select(func.count(Anomaly.id))
        anomalies_result = await self.db.execute(anomalies_query)
        total_anomalies = anomalies_result.scalar() or 0

        # Count by severity
        severity_query = select(Anomaly.severity, func.count(Anomaly.id)).group_by(
            Anomaly.severity
        )
        severity_result = await self.db.execute(severity_query)
        anomalies_by_severity = {row[0]: row[1] for row in severity_result.all()}

        return {
            "total_patterns": total_patterns,
            "total_clusters": total_clusters,
            "total_anomalies": total_anomalies,
            "anomalies_by_severity": anomalies_by_severity,
        }

    def _log_to_dict(self, log: Log) -> dict[str, Any]:
        """Convert SQLAlchemy Log model to dictionary.

        Args:
            log: Log model instance.

        Returns:
            Dictionary representation.
        """
        return {
            "id": log.id,
            "timestamp": log.timestamp,
            "level": log.level,
            "message": log.message,
            "source": log.source,
            "session_id": log.session_id,
            "metadata": log.metadata_,
        }
