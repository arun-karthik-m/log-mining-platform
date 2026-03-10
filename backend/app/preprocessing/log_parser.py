"""Log parsing module for multiple log formats.

Supports:
- JSON logs
- Syslog format
- Apache/Nginx access logs
- Generic timestamped logs
"""

import re
from datetime import datetime
from typing import Any, Optional

from utils.logger import setup_logger

logger = setup_logger(__name__)


# Common log level mappings
LOG_LEVELS = {"DEBUG", "INFO", "WARN", "WARNING", "ERROR", "CRITICAL", "FATAL"}

# Regex patterns for different log formats
SYSLOG_PATTERN = re.compile(
    r"^(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+"
    r"(?P<host>\S+)\s+"
    r"(?P<service>\S+?)(?:\[(?P<pid>\d+)\])?:\s+"
    r"(?P<message>.*)$"
)

APACHE_PATTERN = re.compile(
    r'^(?P<ip>\S+)\s+\S+\s+(?P<user>\S+)\s+\[(?P<timestamp>[^\]]+)\]\s+'
    r'"(?P<method>\S+)\s+(?P<path>\S+)\s+(?P<protocol>[^"]+)"\s+'
    r"(?P<status>\d+)\s+(?P<size>\d+|-)"
)

GENERIC_TIMESTAMP_PATTERN = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+"
    r"(?:\[?(?P<level>[A-Z]+)\]?\s+)??"
    r"(?P<message>.*)$",
    re.IGNORECASE,
)


def parse_json_log(log_entry: dict[str, Any]) -> dict[str, Any]:
    """Parse a JSON log entry.

    Args:
        log_entry: Dictionary containing log data.

    Returns:
        Normalized log dictionary with standard fields.
    """
    # Extract standard fields with various possible key names
    timestamp = _extract_field(log_entry, ["timestamp", "time", "@timestamp", "ts"])
    level = _extract_field(log_entry, ["level", "severity", "log_level", "loglevel"])
    message = _extract_field(log_entry, ["message", "msg", "text", "log"])
    source = _extract_field(log_entry, ["source", "service", "logger", "component"])

    # Parse timestamp
    parsed_timestamp = _parse_timestamp(timestamp) if timestamp else datetime.now()

    # Normalize level
    normalized_level = _normalize_level(level) if level else "INFO"

    # Extract remaining fields as metadata
    standard_keys = {"timestamp", "time", "@timestamp", "ts", "level", "severity",
                     "log_level", "loglevel", "message", "msg", "text", "log",
                     "source", "service", "logger", "component", "metadata"}
    extra_fields = {k: v for k, v in log_entry.items() if k not in standard_keys}

    # Merge explicit metadata with extra fields
    metadata = {}
    if isinstance(log_entry.get("metadata"), dict):
        metadata.update(log_entry["metadata"])
    if extra_fields:
        metadata.update(extra_fields)

    return {
        "timestamp": parsed_timestamp,
        "level": normalized_level,
        "message": message or str(log_entry),
        "source": source,
        "metadata": metadata if metadata else None,
    }


def parse_syslog(log_line: str) -> Optional[dict[str, Any]]:
    """Parse a syslog format log line.

    Args:
        log_line: Raw syslog line.

    Returns:
        Normalized log dictionary or None if parsing fails.
    """
    match = SYSLOG_PATTERN.match(log_line.strip())
    if not match:
        return None

    groups = match.groupdict()

    # Parse timestamp (add current year)
    timestamp_str = groups["timestamp"]
    try:
        timestamp = datetime.strptime(f"{datetime.now().year} {timestamp_str}", "%Y %b %d %H:%M:%S")
    except ValueError:
        timestamp = datetime.now()

    # Extract level from message if present
    message = groups["message"]
    level = _extract_level_from_message(message)

    return {
        "timestamp": timestamp,
        "level": level,
        "message": message,
        "source": groups["service"],
        "metadata": {"host": groups["host"], "pid": groups.get("pid")},
    }


def parse_apache_log(log_line: str) -> Optional[dict[str, Any]]:
    """Parse an Apache/Nginx access log line.

    Args:
        log_line: Raw access log line.

    Returns:
        Normalized log dictionary or None if parsing fails.
    """
    match = APACHE_PATTERN.match(log_line.strip())
    if not match:
        return None

    groups = match.groupdict()

    # Parse timestamp
    timestamp_str = groups["timestamp"]
    try:
        timestamp = datetime.strptime(timestamp_str, "%d/%b/%Y:%H:%M:%S %z")
    except ValueError:
        try:
            timestamp = datetime.strptime(timestamp_str.split()[0], "%d/%b/%Y:%H:%M:%S")
        except ValueError:
            timestamp = datetime.now()

    # Determine level based on status code
    status = int(groups["status"])
    if status >= 500:
        level = "ERROR"
    elif status >= 400:
        level = "WARN"
    else:
        level = "INFO"

    message = f"{groups['method']} {groups['path']} - {status}"

    return {
        "timestamp": timestamp,
        "level": level,
        "message": message,
        "source": "webserver",
        "metadata": {
            "ip": groups["ip"],
            "user": groups["user"],
            "method": groups["method"],
            "path": groups["path"],
            "status": status,
            "size": groups["size"],
        },
    }


def parse_generic_log(log_line: str) -> Optional[dict[str, Any]]:
    """Parse a generic timestamped log line.

    Args:
        log_line: Raw log line.

    Returns:
        Normalized log dictionary or None if parsing fails.
    """
    import re

    # Try pattern with level first
    pattern_with_level = re.compile(
        r"^(?P<timestamp>\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+"
        r"(?P<level>[A-Z]+)\s+"
        r"(?P<message>.*)$",
        re.IGNORECASE,
    )

    match = pattern_with_level.match(log_line.strip())
    if not match:
        # Fall back to pattern without level
        pattern_no_level = re.compile(
            r"^(?P<timestamp>\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+"
            r"(?P<message>.*)$",
        )
        match = pattern_no_level.match(log_line.strip())
        if not match:
            return None

    groups = match.groupdict()

    # Parse timestamp
    timestamp_str = groups["timestamp"]
    parsed_timestamp = _parse_timestamp(timestamp_str) if timestamp_str else datetime.now()

    # Get level
    level = _normalize_level(groups.get("level")) if groups.get("level") else "INFO"

    return {
        "timestamp": parsed_timestamp,
        "level": level,
        "message": groups.get("message", log_line),
        "source": None,
        "metadata": None,
    }


def parse_log_line(log_line: str) -> dict[str, Any]:
    """Auto-detect format and parse a log line.

    Args:
        log_line: Raw log line.

    Returns:
        Normalized log dictionary.
    """
    log_line = log_line.strip()

    if not log_line:
        return {
            "timestamp": datetime.now(),
            "level": "INFO",
            "message": "",
            "source": None,
            "metadata": None,
        }

    # Try JSON first (if it looks like JSON)
    if log_line.startswith("{"):
        import json

        try:
            log_dict = json.loads(log_line)
            if isinstance(log_dict, dict):
                return parse_json_log(log_dict)
        except json.JSONDecodeError:
            pass

    # Try syslog format
    result = parse_syslog(log_line)
    if result:
        return result

    # Try Apache/Nginx format
    result = parse_apache_log(log_line)
    if result:
        return result

    # Fall back to generic format
    result = parse_generic_log(log_line)
    if result:
        return result

    # Last resort - treat entire line as message
    return {
        "timestamp": datetime.now(),
        "level": "INFO",
        "message": log_line,
        "source": None,
        "metadata": None,
    }


def _extract_field(data: dict[str, Any], keys: list[str]) -> Any:
    """Extract a field from dict using multiple possible keys.

    Args:
        data: Dictionary to search.
        keys: List of possible key names.

    Returns:
        Value if found, None otherwise.
    """
    for key in keys:
        if key in data:
            return data[key]
    return None


def _parse_timestamp(timestamp_str: str) -> datetime:
    """Parse various timestamp formats.

    Args:
        timestamp_str: Timestamp string.

    Returns:
        Parsed datetime object.
    """
    formats = [
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(timestamp_str, fmt)
        except ValueError:
            continue

    # If all else fails, return now
    logger.warning(f"Could not parse timestamp: {timestamp_str}")
    return datetime.now()


def _normalize_level(level: Optional[str]) -> str:
    """Normalize log level to standard format.

    Args:
        level: Raw log level string.

    Returns:
        Normalized level string.
    """
    if not level:
        return "INFO"

    level = level.upper().strip()

    # Handle common variations
    level_map = {
        "WARNING": "WARN",
        "FATAL": "CRITICAL",
        "SEVERE": "ERROR",
        "TRACE": "DEBUG",
    }

    return level_map.get(level, level) if level in LOG_LEVELS or level in level_map else "INFO"


def _extract_level_from_message(message: str) -> str:
    """Try to extract log level from message content.

    Args:
        message: Log message string.

    Returns:
        Extracted level or INFO if not found.
    """
    message_upper = message.upper()

    for level in ["CRITICAL", "FATAL", "ERROR", "WARN", "WARNING", "INFO", "DEBUG"]:
        if level in message_upper:
            return _normalize_level(level)

    return "INFO"
