"""Tests for log parser module."""

import json
from datetime import datetime

import pytest

from app.preprocessing.log_parser import (
    parse_generic_log,
    parse_json_log,
    parse_log_line,
    parse_syslog,
)


class TestParseJsonLog:
    """Tests for JSON log parsing."""

    def test_parse_standard_json_log(self) -> None:
        """Test parsing standard JSON log."""
        log_entry = {
            "timestamp": "2026-03-10T08:00:01Z",
            "level": "ERROR",
            "message": "Database connection failed",
            "source": "db-service",
        }

        result = parse_json_log(log_entry)

        assert result["level"] == "ERROR"
        assert result["message"] == "Database connection failed"
        assert result["source"] == "db-service"
        assert isinstance(result["timestamp"], datetime)

    def test_parse_json_with_alternate_keys(self) -> None:
        """Test parsing JSON with alternate key names."""
        log_entry = {
            "time": "2026-03-10T08:00:01Z",
            "severity": "WARN",
            "msg": "High memory usage",
            "component": "monitor",
        }

        result = parse_json_log(log_entry)

        assert result["level"] == "WARN"
        assert result["message"] == "High memory usage"
        assert result["source"] == "monitor"

    def test_parse_json_with_metadata(self) -> None:
        """Test parsing JSON preserves metadata."""
        log_entry = {
            "timestamp": "2026-03-10T08:00:01Z",
            "level": "INFO",
            "message": "Request processed",
            "user_id": "123",
            "request_id": "abc",
        }

        result = parse_json_log(log_entry)

        assert result["metadata"] is not None
        assert result["metadata"]["user_id"] == "123"
        assert result["metadata"]["request_id"] == "abc"


class TestParseSyslog:
    """Tests for syslog parsing."""

    def test_parse_standard_syslog(self) -> None:
        """Test parsing standard syslog format."""
        log_line = "Mar 10 08:00:01 server auth-service[1234]: User login successful"

        result = parse_syslog(log_line)

        assert result is not None
        assert result["source"] == "auth-service"
        assert result["message"] == "User login successful"

    def test_parse_syslog_without_pid(self) -> None:
        """Test parsing syslog without PID."""
        log_line = "Mar 10 08:00:01 server nginx: Connection accepted"

        result = parse_syslog(log_line)

        assert result is not None
        assert result["source"] == "nginx"


class TestParseGenericLog:
    """Tests for generic log parsing."""

    def test_parse_generic_with_level(self) -> None:
        """Test parsing generic log with level."""
        log_line = "2026-03-10T08:00:01Z ERROR Database timeout"

        result = parse_generic_log(log_line)

        assert result is not None
        assert result["level"] == "ERROR"
        assert "Database timeout" in result["message"]

    def test_parse_generic_without_level(self) -> None:
        """Test parsing generic log without level."""
        log_line = "2026-03-10T08:00:01Z Some message here"

        result = parse_generic_log(log_line)

        assert result is not None
        assert result["level"] == "INFO"


class TestParseLogLine:
    """Tests for auto-detect log parsing."""

    def test_auto_detect_json(self) -> None:
        """Test auto-detection of JSON format."""
        log_line = json.dumps({
            "timestamp": "2026-03-10T08:00:01Z",
            "level": "INFO",
            "message": "Test message",
        })

        result = parse_log_line(log_line)

        assert result["level"] == "INFO"

    def test_auto_detect_syslog(self) -> None:
        """Test auto-detection of syslog format."""
        log_line = "Mar 10 08:00:01 server service: Message"

        result = parse_log_line(log_line)

        assert result["source"] == "service"

    def test_auto_detect_generic(self) -> None:
        """Test auto-detection of generic format."""
        log_line = "2026-03-10T08:00:01Z INFO Application started"

        result = parse_log_line(log_line)

        assert result["level"] == "INFO"

    def test_parse_empty_line(self) -> None:
        """Test parsing empty line."""
        result = parse_log_line("")

        assert result["message"] == ""
        assert result["level"] == "INFO"
