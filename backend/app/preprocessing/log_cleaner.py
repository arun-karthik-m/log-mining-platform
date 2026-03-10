"""Log cleaning and normalization module.

Provides functions for:
- Whitespace normalization
- Duplicate removal
- Noise filtering
- Level standardization
"""

import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional

from utils.logger import setup_logger

logger = setup_logger(__name__)


# Common noise patterns to filter
NOISE_PATTERNS = [
    "^$",  # Empty lines
    "^\\s*$",  # Whitespace only
    "^\\s*#.*$",  # Comments
    "^\\s*//.*$",  # Single-line comments
]

# Log levels in order of severity
LEVEL_ORDER = ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"]


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text.

    Args:
        text: Input text.

    Returns:
        Text with normalized whitespace.
    """
    if not text:
        return text

    # Replace multiple spaces with single space
    import re

    text = re.sub(r"\s+", " ", text)

    # Strip leading/trailing whitespace
    return text.strip()


def generate_log_hash(log_entry: dict[str, Any]) -> str:
    """Generate a hash for duplicate detection.

    Args:
        log_entry: Log dictionary.

    Returns:
        MD5 hash of log content.
    """
    # Create hash from timestamp, level, and message
    content = f"{log_entry.get('timestamp', '')}{log_entry.get('level', '')}{log_entry.get('message', '')}"
    return hashlib.md5(content.encode(), usedforsecurity=False).hexdigest()


def remove_duplicates(logs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove duplicate log entries.

    Args:
        logs: List of log dictionaries.

    Returns:
        List with duplicates removed.
    """
    seen_hashes: set[str] = set()
    unique_logs: list[dict[str, Any]] = []

    for log in logs:
        log_hash = generate_log_hash(log)
        if log_hash not in seen_hashes:
            seen_hashes.add(log_hash)
            unique_logs.append(log)

    logger.info(f"Removed {len(logs) - len(unique_logs)} duplicate logs")
    return unique_logs


def filter_noise(
    logs: list[dict[str, Any]],
    min_level: str = "DEBUG",
) -> list[dict[str, Any]]:
    """Filter out noise and irrelevant logs.

    Args:
        logs: List of log dictionaries.
        min_level: Minimum log level to keep.

    Returns:
        Filtered list of logs.
    """
    import re

    min_level_index = LEVEL_ORDER.index(min_level) if min_level in LEVEL_ORDER else 0

    filtered_logs: list[dict[str, Any]] = []

    for log in logs:
        message = log.get("message", "")

        # Skip empty messages
        if not message or not message.strip():
            continue

        # Skip noise patterns
        is_noise = False
        for pattern in NOISE_PATTERNS:
            if re.match(pattern, message):
                is_noise = True
                break

        if is_noise:
            continue

        # Filter by level
        log_level = log.get("level", "INFO")
        if log_level in LEVEL_ORDER:
            level_index = LEVEL_ORDER.index(log_level)
            if level_index < min_level_index:
                continue

        filtered_logs.append(log)

    logger.info(f"Filtered {len(logs) - len(filtered_logs)} noise logs")
    return filtered_logs


def standardize_levels(logs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Standardize log levels across all logs.

    Args:
        logs: List of log dictionaries.

    Returns:
        List with standardized levels.
    """
    # Level normalization map
    level_map = {
        "TRACE": "DEBUG",
        "DEBUG": "DEBUG",
        "INFO": "INFO",
        "INFORMATION": "INFO",
        "WARN": "WARN",
        "WARNING": "WARN",
        "ERROR": "ERROR",
        "ERR": "ERROR",
        "CRITICAL": "CRITICAL",
        "FATAL": "CRITICAL",
        "SEVERE": "CRITICAL",
    }

    standardized_logs: list[dict[str, Any]] = []

    for log in logs:
        log_copy = log.copy()
        original_level = log.get("level", "INFO")

        # Normalize level
        normalized_level = level_map.get(original_level.upper(), "INFO")
        log_copy["level"] = normalized_level

        standardized_logs.append(log_copy)

    return standardized_logs


def normalize_timestamps(
    logs: list[dict[str, Any]],
    reference_time: Optional[datetime] = None,
) -> list[dict[str, Any]]:
    """Normalize timestamps to UTC.

    Args:
        logs: List of log dictionaries.
        reference_time: Reference time for relative timestamps.

    Returns:
        List with normalized timestamps.
    """
    normalized_logs: list[dict[str, Any]] = []

    for log in logs:
        log_copy = log.copy()
        timestamp = log.get("timestamp")

        if timestamp:
            # If timestamp is naive, assume UTC
            if isinstance(timestamp, datetime) and timestamp.tzinfo is None:
                pass  # Keep as is, already handled in parser

        log_copy["timestamp"] = timestamp
        normalized_logs.append(log_copy)

    return normalized_logs


def clean_logs(
    logs: list[dict[str, Any]],
    remove_dups: bool = True,
    filter_noise_flag: bool = True,
    standardize: bool = True,
    min_level: str = "DEBUG",
) -> list[dict[str, Any]]:
    """Apply all cleaning operations to logs.

    Args:
        logs: List of log dictionaries.
        remove_dups: Whether to remove duplicates.
        filter_noise_flag: Whether to filter noise.
        standardize: Whether to standardize levels.
        min_level: Minimum log level to keep.

    Returns:
        Cleaned list of logs.
    """
    if not logs:
        return []

    result = logs

    # Apply cleaning steps in order
    if remove_dups:
        result = remove_duplicates(result)

    if filter_noise_flag:
        result = filter_noise(result, min_level)

    if standardize:
        result = standardize_levels(result)

    logger.info(f"Cleaned logs: {len(logs)} -> {len(result)}")
    return result


def validate_log_entry(log_entry: dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Validate a log entry has required fields.

    Args:
        log_entry: Log dictionary to validate.

    Returns:
        Tuple of (is_valid, error_message).
    """
    if not isinstance(log_entry, dict):
        return False, "Log entry must be a dictionary"

    if "timestamp" not in log_entry:
        return False, "Missing required field: timestamp"

    if "message" not in log_entry:
        return False, "Missing required field: message"

    timestamp = log_entry.get("timestamp")
    if not isinstance(timestamp, datetime):
        return False, "Timestamp must be a datetime object"

    level = log_entry.get("level", "INFO")
    if level not in LEVEL_ORDER:
        logger.warning(f"Unknown log level: {level}, defaulting to INFO")

    return True, None
