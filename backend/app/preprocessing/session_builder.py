"""Session builder module for grouping related logs.

Sessions are created based on:
- Time window proximity
- Common identifiers (user_id, session_id, IP)
- Source correlation
"""

import hashlib
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Optional

from utils.logger import setup_logger

logger = setup_logger(__name__)


# Default session timeout (30 minutes)
DEFAULT_SESSION_TIMEOUT = timedelta(minutes=30)

# Minimum logs per session
MIN_SESSION_LOGS = 1


def generate_session_key(log_entry: dict[str, Any]) -> str:
    """Generate a session key based on log metadata.

    Args:
        log_entry: Log dictionary.

    Returns:
        Session key string.
    """
    metadata = log_entry.get("metadata", {}) or {}

    # Try to find session identifiers in order of preference
    identifiers = [
        metadata.get("session_id"),
        metadata.get("user_id"),
        metadata.get("request_id"),
        metadata.get("trace_id"),
        metadata.get("ip"),
        log_entry.get("source"),
    ]

    # Use first available identifier
    for identifier in identifiers:
        if identifier:
            return f"session_{identifier}"

    # Fallback: generate hash from source and timestamp
    source = log_entry.get("source", "unknown")
    timestamp = log_entry.get("timestamp", datetime.now())
    content = f"{source}_{timestamp}"
    return f"session_{hashlib.md5(content.encode(), usedforsecurity=False).hexdigest()[:12]}"


def build_sessions(
    logs: list[dict[str, Any]],
    timeout: timedelta = DEFAULT_SESSION_TIMEOUT,
    min_logs: int = MIN_SESSION_LOGS,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build sessions from a list of logs.

    Args:
        logs: List of log dictionaries.
        timeout: Maximum time gap between logs in a session.
        min_logs: Minimum number of logs per session.

    Returns:
        Tuple of (logs with session_id, list of session dictionaries).
    """
    if not logs:
        return [], []

    # Sort logs by timestamp
    sorted_logs = sorted(logs, key=lambda x: x.get("timestamp", datetime.min))

    # Group logs by session key
    session_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for log in sorted_logs:
        session_key = generate_session_key(log)
        session_groups[session_key].append(log)

    # Process each session group
    sessions: list[dict[str, Any]] = []
    logs_with_session: list[dict[str, Any]] = []

    for session_key, session_logs in session_groups.items():
        # Split into sub-sessions based on timeout
        sub_sessions = _split_by_timeout(session_logs, timeout)

        for sub_session_logs in sub_sessions:
            if len(sub_session_logs) < min_logs:
                continue

            # Create session record
            session = _create_session_record(session_key, sub_session_logs)
            sessions.append(session)

            # Add session_id to logs
            session_id = session["id"]
            for log in sub_session_logs:
                log_copy = log.copy()
                log_copy["session_id"] = session_id
                logs_with_session.append(log_copy)

    logger.info(f"Built {len(sessions)} sessions from {len(logs)} logs")
    return logs_with_session, sessions


def _split_by_timeout(
    logs: list[dict[str, Any]],
    timeout: timedelta,
) -> list[list[dict[str, Any]]]:
    """Split logs into sub-sessions based on time gaps.

    Args:
        logs: List of logs (should be sorted by timestamp).
        timeout: Maximum time gap.

    Returns:
        List of log groups.
    """
    if not logs:
        return []

    groups: list[list[dict[str, Any]]] = []
    current_group: list[dict[str, Any]] = [logs[0]]

    for i in range(1, len(logs)):
        prev_log = logs[i - 1]
        curr_log = logs[i]

        prev_time = prev_log.get("timestamp", datetime.min)
        curr_time = curr_log.get("timestamp", datetime.min)

        # Check if time gap exceeds timeout
        if curr_time - prev_time > timeout:
            # Start new group
            groups.append(current_group)
            current_group = [curr_log]
        else:
            current_group.append(curr_log)

    # Don't forget the last group
    if current_group:
        groups.append(current_group)

    return groups


def _create_session_record(
    session_key: str,
    logs: list[dict[str, Any]],
) -> dict[str, Any]:
    """Create a session record from logs.

    Args:
        session_key: Session identifier.
        logs: List of logs in the session.

    Returns:
        Session dictionary.
    """
    timestamps = [log.get("timestamp") for log in logs if log.get("timestamp")]

    start_time = min(timestamps) if timestamps else datetime.now()
    end_time = max(timestamps) if timestamps else None

    # Generate a unique session ID
    session_id = hashlib.md5(
        f"{session_key}_{start_time}".encode(),
        usedforsecurity=False,
    ).hexdigest()[:16]

    return {
        "id": int(session_id, 16) % (10**12),  # Convert to numeric ID
        "session_key": f"{session_key}_{session_id}",
        "start_time": start_time,
        "end_time": end_time,
        "event_count": len(logs),
        "created_at": datetime.now(),
    }


def calculate_session_statistics(
    sessions: list[dict[str, Any]],
) -> dict[str, Any]:
    """Calculate statistics about sessions.

    Args:
        sessions: List of session dictionaries.

    Returns:
        Dictionary with session statistics.
    """
    if not sessions:
        return {
            "total_sessions": 0,
            "avg_events_per_session": 0,
            "avg_duration_seconds": 0,
            "total_events": 0,
        }

    total_events = sum(s.get("event_count", 0) for s in sessions)

    durations = []
    for session in sessions:
        start = session.get("start_time")
        end = session.get("end_time")
        if start and end:
            duration = (end - start).total_seconds()
            durations.append(duration)

    avg_duration = sum(durations) / len(durations) if durations else 0

    return {
        "total_sessions": len(sessions),
        "avg_events_per_session": total_events / len(sessions),
        "avg_duration_seconds": avg_duration,
        "total_events": total_events,
    }


def get_session_by_id(
    sessions: list[dict[str, Any]],
    session_id: int,
) -> Optional[dict[str, Any]]:
    """Find a session by ID.

    Args:
        sessions: List of sessions.
        session_id: Session ID to find.

    Returns:
        Session dictionary or None.
    """
    for session in sessions:
        if session.get("id") == session_id:
            return session
    return None


def get_logs_for_session(
    logs: list[dict[str, Any]],
    session_id: int,
) -> list[dict[str, Any]]:
    """Get all logs belonging to a session.

    Args:
        logs: List of logs.
        session_id: Session ID.

    Returns:
        List of logs for the session.
    """
    return [log for log in logs if log.get("session_id") == session_id]
