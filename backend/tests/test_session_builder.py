"""Tests for session builder module."""

from datetime import datetime, timedelta

import pytest

from app.preprocessing.session_builder import (
    build_sessions,
    generate_session_key,
    get_logs_for_session,
)


class TestGenerateSessionKey:
    """Tests for session key generation."""

    def test_session_key_from_user_id(self) -> None:
        """Test session key from user_id."""
        log_entry = {
            "timestamp": datetime(2026, 3, 10, 8, 0),
            "message": "Test",
            "metadata": {"user_id": "user123"},
        }

        key = generate_session_key(log_entry)

        assert "user123" in key

    def test_session_key_from_session_id(self) -> None:
        """Test session key from session_id."""
        log_entry = {
            "timestamp": datetime(2026, 3, 10, 8, 0),
            "message": "Test",
            "metadata": {"session_id": "sess456"},
        }

        key = generate_session_key(log_entry)

        assert "sess456" in key

    def test_session_key_fallback(self) -> None:
        """Test session key fallback."""
        log_entry = {
            "timestamp": datetime(2026, 3, 10, 8, 0),
            "message": "Test",
            "source": "test-service",
        }

        key = generate_session_key(log_entry)

        assert key.startswith("session_")


class TestBuildSessions:
    """Tests for session building."""

    def test_build_single_session(self) -> None:
        """Test building single session from logs."""
        logs = [
            {
                "timestamp": datetime(2026, 3, 10, 8, 0),
                "level": "INFO",
                "message": "Login",
                "metadata": {"user_id": "user1"},
            },
            {
                "timestamp": datetime(2026, 3, 10, 8, 5),
                "level": "INFO",
                "message": "Search",
                "metadata": {"user_id": "user1"},
            },
        ]

        logs_with_session, sessions = build_sessions(logs)

        assert len(sessions) == 1
        assert len(logs_with_session) == 2
        assert all("session_id" in log for log in logs_with_session)

    def test_build_multiple_sessions_by_user(self) -> None:
        """Test building multiple sessions by different users."""
        logs = [
            {
                "timestamp": datetime(2026, 3, 10, 8, 0),
                "level": "INFO",
                "message": "Login",
                "metadata": {"user_id": "user1"},
            },
            {
                "timestamp": datetime(2026, 3, 10, 8, 5),
                "level": "INFO",
                "message": "Login",
                "metadata": {"user_id": "user2"},
            },
        ]

        logs_with_session, sessions = build_sessions(logs)

        assert len(sessions) == 2

    def test_build_sessions_timeout_split(self) -> None:
        """Test session splitting by timeout."""
        logs = [
            {
                "timestamp": datetime(2026, 3, 10, 8, 0),
                "level": "INFO",
                "message": "Login",
                "metadata": {"user_id": "user1"},
            },
            {
                "timestamp": datetime(2026, 3, 10, 10, 0),  # 2 hours later
                "level": "INFO",
                "message": "Search",
                "metadata": {"user_id": "user1"},
            },
        ]

        # Use 30 minute timeout (default)
        logs_with_session, sessions = build_sessions(logs)

        # Should create 2 sessions due to timeout
        assert len(sessions) == 2

    def test_build_sessions_empty_logs(self) -> None:
        """Test building sessions with no logs."""
        logs_with_session, sessions = build_sessions([])

        assert len(sessions) == 0
        assert len(logs_with_session) == 0


class TestGetLogsForSession:
    """Tests for retrieving session logs."""

    def test_get_logs_for_session(self) -> None:
        """Test getting logs for specific session."""
        logs = [
            {"timestamp": datetime(2026, 3, 10, 8, 0), "level": "INFO", "message": "Test", "session_id": 1},
            {"timestamp": datetime(2026, 3, 10, 8, 1), "level": "INFO", "message": "Test", "session_id": 1},
            {"timestamp": datetime(2026, 3, 10, 8, 2), "level": "INFO", "message": "Test", "session_id": 2},
        ]

        result = get_logs_for_session(logs, 1)

        assert len(result) == 2
        assert all(log["session_id"] == 1 for log in result)
