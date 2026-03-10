"""Tests for log cleaner module."""

from datetime import datetime

import pytest

from app.preprocessing.log_cleaner import (
    clean_logs,
    generate_log_hash,
    normalize_whitespace,
    remove_duplicates,
    validate_log_entry,
)


class TestNormalizeWhitespace:
    """Tests for whitespace normalization."""

    def test_normalize_multiple_spaces(self) -> None:
        """Test normalizing multiple spaces."""
        text = "This   has    many     spaces"
        result = normalize_whitespace(text)
        assert result == "This has many spaces"

    def test_normalize_tabs_and_newlines(self) -> None:
        """Test normalizing tabs and newlines."""
        text = "Line1\t\tLine2\n\nLine3"
        result = normalize_whitespace(text)
        assert "  " not in result

    def test_normalize_empty_string(self) -> None:
        """Test normalizing empty string."""
        assert normalize_whitespace("") == ""


class TestRemoveDuplicates:
    """Tests for duplicate removal."""

    def test_remove_exact_duplicates(self) -> None:
        """Test removing exact duplicate logs."""
        logs = [
            {"timestamp": datetime(2026, 3, 10, 8, 0), "level": "INFO", "message": "Test"},
            {"timestamp": datetime(2026, 3, 10, 8, 0), "level": "INFO", "message": "Test"},
            {"timestamp": datetime(2026, 3, 10, 8, 1), "level": "ERROR", "message": "Error"},
        ]

        result = remove_duplicates(logs)

        assert len(result) == 2

    def test_keep_different_logs(self) -> None:
        """Test keeping different logs."""
        logs = [
            {"timestamp": datetime(2026, 3, 10, 8, 0), "level": "INFO", "message": "Test 1"},
            {"timestamp": datetime(2026, 3, 10, 8, 1), "level": "INFO", "message": "Test 2"},
        ]

        result = remove_duplicates(logs)

        assert len(result) == 2


class TestValidateLogEntry:
    """Tests for log validation."""

    def test_valid_log_entry(self) -> None:
        """Test validating valid log entry."""
        log_entry = {
            "timestamp": datetime(2026, 3, 10, 8, 0),
            "message": "Test message",
            "level": "INFO",
        }

        is_valid, error = validate_log_entry(log_entry)

        assert is_valid is True
        assert error is None

    def test_missing_timestamp(self) -> None:
        """Test validation fails without timestamp."""
        log_entry = {"message": "Test message"}

        is_valid, error = validate_log_entry(log_entry)

        assert is_valid is False
        assert "timestamp" in error

    def test_missing_message(self) -> None:
        """Test validation fails without message."""
        log_entry = {"timestamp": datetime(2026, 3, 10, 8, 0)}

        is_valid, error = validate_log_entry(log_entry)

        assert is_valid is False
        assert "message" in error

    def test_non_dict_entry(self) -> None:
        """Test validation fails for non-dict entry."""
        is_valid, error = validate_log_entry("not a dict")
        assert is_valid is False


class TestCleanLogs:
    """Tests for full cleaning pipeline."""

    def test_clean_logs_removes_duplicates(self) -> None:
        """Test cleaning removes duplicates."""
        logs = [
            {"timestamp": datetime(2026, 3, 10, 8, 0), "level": "INFO", "message": "Test"},
            {"timestamp": datetime(2026, 3, 10, 8, 0), "level": "INFO", "message": "Test"},
        ]

        result = clean_logs(logs, remove_dups=True, filter_noise_flag=False, standardize=False)

        assert len(result) == 1

    def test_clean_logs_standardizes_levels(self) -> None:
        """Test cleaning standardizes levels."""
        logs = [
            {"timestamp": datetime(2026, 3, 10, 8, 0), "level": "WARNING", "message": "Test"},
            {"timestamp": datetime(2026, 3, 10, 8, 1), "level": "FATAL", "message": "Critical"},
        ]

        result = clean_logs(logs, remove_dups=False, filter_noise_flag=False, standardize=True)

        assert result[0]["level"] == "WARN"
        assert result[1]["level"] == "CRITICAL"
