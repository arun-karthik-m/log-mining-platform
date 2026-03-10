"""Anomaly detection module using Isolation Forest.

Implements:
- Isolation Forest for anomaly detection
- Time-series based anomaly detection
- Anomaly classification and severity scoring
"""

from datetime import datetime, timedelta
from typing import Any, Optional

import numpy as np
from sklearn.ensemble import IsolationForest

from utils.logger import setup_logger

logger = setup_logger(__name__)


# Anomaly types
ANOMALY_TYPE_VOLUME_SPIKE = "volume_spike"
ANOMALY_TYPE_ERROR_RATE = "error_rate_anomaly"
ANOMALY_TYPE_SEQUENCE = "sequence_anomaly"
ANOMALY_TYPE_TIME_BASED = "time_based_anomaly"

# Severity levels
SEVERITY_LOW = "low"
SEVERITY_MEDIUM = "medium"
SEVERITY_HIGH = "high"
SEVERITY_CRITICAL = "critical"


class AnomalyDetector:
    """Anomaly detection using Isolation Forest."""

    def __init__(
        self,
        contamination: float = 0.1,
        random_state: int = 42,
    ) -> None:
        """Initialize detector.

        Args:
            contamination: Expected proportion of anomalies.
            random_state: Random seed for reproducibility.
        """
        self.contamination = contamination
        self.random_state = random_state

        self._isolation_forest: Optional[IsolationForest] = None
        self._labels: Optional[np.ndarray] = None
        self._scores: Optional[np.ndarray] = None

    def fit(self, logs: list[dict[str, Any]]) -> "AnomalyDetector":
        """Fit the detector on logs.

        Args:
            logs: List of log dictionaries.

        Returns:
            Self for method chaining.
        """
        if not logs:
            logger.warning("No logs provided for anomaly detection")
            return self

        # Extract features
        features = self._extract_features(logs)

        if features.size == 0:
            logger.warning("No features extracted for anomaly detection")
            return self

        # Fit Isolation Forest
        self._isolation_forest = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100,
        )

        self._labels = self._isolation_forest.fit_predict(features)
        self._scores = self._isolation_forest.score_samples(features)

        anomaly_count = np.sum(self._labels == -1)
        logger.info(f"Detected {anomaly_count} anomalies in {len(logs)} logs")

        return self

    def get_anomalies(self, logs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Get detected anomalies.

        Args:
            logs: List of log dictionaries.

        Returns:
            List of anomaly dictionaries.
        """
        if self._labels is None:
            logger.warning("Model not fitted. Call fit() first.")
            return []

        anomalies = []

        for i, log in enumerate(logs):
            if self._labels[i] == -1:  # Anomaly
                score = float(self._scores[i]) if self._scores is not None else 0

                anomaly = {
                    "log": log,
                    "anomaly_score": score,
                    "severity": self._calculate_severity(score),
                    "type": self._classify_anomaly(log, score),
                }

                anomalies.append(anomaly)

        return anomalies

    def _extract_features(self, logs: list[dict[str, Any]]) -> np.ndarray:
        """Extract numerical features from logs for anomaly detection.

        Args:
            logs: List of log dictionaries.

        Returns:
            Feature matrix.
        """
        features = []

        for log in logs:
            feature_vector = self._extract_single_feature(log)
            features.append(feature_vector)

        return np.array(features)

    def _extract_single_feature(self, log: dict[str, Any]) -> list[float]:
        """Extract features from a single log.

        Args:
            log: Log dictionary.

        Returns:
            Feature vector.
        """
        features = []

        # Level encoding (severity)
        level_map = {"DEBUG": 0, "INFO": 1, "WARN": 2, "ERROR": 3, "CRITICAL": 4}
        level = log.get("level", "INFO")
        features.append(level_map.get(level, 1))

        # Message length
        message = log.get("message", "")
        features.append(len(message))

        # Word count
        features.append(len(message.split()))

        # Has error keywords
        error_keywords = ["error", "fail", "exception", "timeout", "critical"]
        has_error = any(kw in message.lower() for kw in error_keywords)
        features.append(1.0 if has_error else 0.0)

        # Has numbers (might indicate IDs, counts, etc.)
        has_numbers = any(c.isdigit() for c in message)
        features.append(1.0 if has_numbers else 0.0)

        # Hour of day (for time-based anomalies)
        timestamp = log.get("timestamp")
        if isinstance(timestamp, datetime):
            features.append(timestamp.hour / 23.0)  # Normalize to 0-1
        else:
            features.append(0.5)

        return features

    def _calculate_severity(self, score: float) -> str:
        """Calculate anomaly severity from score.

        Args:
            score: Anomaly score (more negative = more anomalous).

        Returns:
            Severity string.
        """
        # Scores are typically between -1 and 0
        # More negative = more anomalous
        if score < -0.7:
            return SEVERITY_CRITICAL
        elif score < -0.5:
            return SEVERITY_HIGH
        elif score < -0.3:
            return SEVERITY_MEDIUM
        else:
            return SEVERITY_LOW

    def _classify_anomaly(self, log: dict[str, Any], score: float) -> str:
        """Classify the type of anomaly.

        Args:
            log: Log dictionary.
            score: Anomaly score.

        Returns:
            Anomaly type string.
        """
        level = log.get("level", "INFO")
        message = log.get("message", "").lower()

        # Check for error-related anomalies
        if level in ["ERROR", "CRITICAL"]:
            return ANOMALY_TYPE_ERROR_RATE

        # Check for time-based anomalies
        timestamp = log.get("timestamp")
        if isinstance(timestamp, datetime):
            hour = timestamp.hour
            if hour < 6 or hour > 22:  # Off-hours
                return ANOMALY_TYPE_TIME_BASED

        # Check for specific patterns
        if "spike" in message or "surge" in message:
            return ANOMALY_TYPE_VOLUME_SPIKE

        # Default
        return ANOMALY_TYPE_SEQUENCE


def detect_anomalies(
    logs: list[dict[str, Any]],
    contamination: float = 0.1,
) -> list[dict[str, Any]]:
    """Detect anomalies in logs.

    This is a stateless function for pure functional usage.

    Args:
        logs: List of log dictionaries.
        contamination: Expected proportion of anomalies.

    Returns:
        List of anomaly dictionaries.
    """
    detector = AnomalyDetector(contamination=contamination)
    detector.fit(logs)

    return detector.get_anomalies(logs)


def detect_volume_spikes(
    logs: list[dict[str, Any]],
    window_minutes: int = 5,
    threshold_multiplier: float = 3.0,
) -> list[dict[str, Any]]:
    """Detect volume spikes in log frequency.

    Args:
        logs: List of log dictionaries.
        window_minutes: Time window for aggregation.
        threshold_multiplier: Standard deviations for threshold.

    Returns:
        List of volume spike anomalies.
    """
    if not logs:
        return []

    # Group logs by time window
    time_buckets: dict[datetime, int] = {}

    for log in logs:
        timestamp = log.get("timestamp")
        if not isinstance(timestamp, datetime):
            continue

        # Round to window
        bucket = timestamp.replace(
            minute=(timestamp.minute // window_minutes) * window_minutes,
            second=0,
            microsecond=0,
        )

        time_buckets[bucket] = time_buckets.get(bucket, 0) + 1

    if len(time_buckets) < 3:
        return []

    # Calculate statistics
    counts = list(time_buckets.values())
    mean_count = np.mean(counts)
    std_count = np.std(counts)

    if std_count == 0:
        return []

    # Find spikes
    threshold = mean_count + (threshold_multiplier * std_count)
    spikes = []

    for bucket, count in time_buckets.items():
        if count > threshold:
            spike = {
                "type": ANOMALY_TYPE_VOLUME_SPIKE,
                "severity": _calculate_spike_severity(count, mean_count, std_count),
                "description": f"Volume spike detected: {count} logs in {window_minutes}min window (avg: {mean_count:.1f})",
                "timestamp": bucket,
                "metadata": {
                    "count": count,
                    "mean": mean_count,
                    "std": std_count,
                    "threshold": threshold,
                },
            }
            spikes.append(spike)

    logger.info(f"Detected {len(spikes)} volume spikes")
    return spikes


def detect_error_rate_anomalies(
    logs: list[dict[str, Any]],
    window_minutes: int = 10,
    threshold_rate: float = 0.3,
) -> list[dict[str, Any]]:
    """Detect anomalies in error rates.

    Args:
        logs: List of log dictionaries.
        window_minutes: Time window for aggregation.
        threshold_rate: Error rate threshold.

    Returns:
        List of error rate anomalies.
    """
    if not logs:
        return []

    # Group logs by time window
    time_buckets: dict[datetime, dict[str, int]] = {}

    for log in logs:
        timestamp = log.get("timestamp")
        if not isinstance(timestamp, datetime):
            continue

        bucket = timestamp.replace(
            minute=(timestamp.minute // window_minutes) * window_minutes,
            second=0,
            microsecond=0,
        )

        if bucket not in time_buckets:
            time_buckets[bucket] = {"total": 0, "errors": 0}

        time_buckets[bucket]["total"] += 1

        level = log.get("level", "")
        if level in ["ERROR", "CRITICAL"]:
            time_buckets[bucket]["errors"] += 1

    # Find high error rate windows
    anomalies = []

    for bucket, counts in time_buckets.items():
        if counts["total"] < 5:  # Skip small windows
            continue

        error_rate = counts["errors"] / counts["total"]

        if error_rate > threshold_rate:
            anomaly = {
                "type": ANOMALY_TYPE_ERROR_RATE,
                "severity": _calculate_error_severity(error_rate),
                "description": f"High error rate: {error_rate:.1%} in {window_minutes}min window",
                "timestamp": bucket,
                "metadata": {
                    "error_rate": error_rate,
                    "error_count": counts["errors"],
                    "total_count": counts["total"],
                },
            }
            anomalies.append(anomaly)

    logger.info(f"Detected {len(anomalies)} error rate anomalies")
    return anomalies


def _calculate_spike_severity(
    count: int,
    mean: float,
    std: float,
) -> str:
    """Calculate severity for volume spike.

    Args:
        count: Actual count.
        mean: Mean count.
        std: Standard deviation.

    Returns:
        Severity string.
    """
    if std == 0:
        return SEVERITY_LOW

    z_score = (count - mean) / std

    if z_score > 5:
        return SEVERITY_CRITICAL
    elif z_score > 4:
        return SEVERITY_HIGH
    elif z_score > 3:
        return SEVERITY_MEDIUM
    else:
        return SEVERITY_LOW


def _calculate_error_severity(error_rate: float) -> str:
    """Calculate severity for error rate anomaly.

    Args:
        error_rate: Error rate (0-1).

    Returns:
        Severity string.
    """
    if error_rate > 0.7:
        return SEVERITY_CRITICAL
    elif error_rate > 0.5:
        return SEVERITY_HIGH
    elif error_rate > 0.3:
        return SEVERITY_MEDIUM
    else:
        return SEVERITY_LOW


def format_anomaly_for_storage(anomaly: dict[str, Any]) -> dict[str, Any]:
    """Format anomaly for database storage.

    Args:
        anomaly: Anomaly dictionary.

    Returns:
        Formatted dictionary for storage.
    """
    description = anomaly.get("description", "")
    metadata = anomaly.get("metadata", {})

    # Generate description for Isolation Forest anomalies that lack one
    if not description and "log" in anomaly:
        log = anomaly["log"]
        score = anomaly.get("anomaly_score", 0)
        atype = anomaly.get("type", "unknown")
        level = log.get("level", "INFO")
        source = log.get("source", "unknown")
        msg = log.get("message", "")[:80]

        if atype == ANOMALY_TYPE_TIME_BASED:
            ts = log.get("timestamp")
            hour = ts.hour if isinstance(ts, datetime) else "unknown"
            description = f"Unusual activity at hour {hour}: [{level}] {msg}"
        elif atype == ANOMALY_TYPE_ERROR_RATE:
            description = f"Anomalous error from {source}: [{level}] {msg}"
        elif atype == ANOMALY_TYPE_VOLUME_SPIKE:
            description = f"Volume anomaly from {source}: {msg}"
        else:
            description = f"Anomalous pattern detected from {source}: [{level}] {msg}"

        metadata = {
            "anomaly_score": round(score, 4),
            "log_level": level,
            "log_source": source,
        }

    return {
        "anomaly_type": anomaly.get("type", "unknown"),
        "severity": anomaly.get("severity", SEVERITY_LOW),
        "description": description,
        "detected_at": datetime.now(),
        "metadata": metadata,
    }
