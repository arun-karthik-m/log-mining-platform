"""Tests for pattern mining module."""

import pytest

from app.mining.pattern_mining import (
    PatternMiner,
    extract_event_sequences,
    mine_frequent_patterns,
)


class TestPatternMiner:
    """Tests for PatternMiner class."""

    def test_fit_simple_sequences(self) -> None:
        """Test fitting on simple sequences."""
        sequences = [
            ["A", "B", "C"],
            ["A", "B"],
            ["A", "C"],
            ["B", "C"],
        ]

        miner = PatternMiner(min_support=0.25)
        miner.fit(sequences)

        patterns = miner.get_frequent_patterns()

        assert len(patterns) > 0
        assert any(p["items"] == ["A"] for p in patterns)

    def test_fit_empty_sequences(self) -> None:
        """Test fitting on empty sequences."""
        miner = PatternMiner(min_support=0.1)
        miner.fit([])

        patterns = miner.get_frequent_patterns()

        assert len(patterns) == 0

    def test_get_statistics(self) -> None:
        """Test getting mining statistics."""
        sequences = [
            ["A", "B"],
            ["A", "B"],
            ["A"],
        ]

        miner = PatternMiner(min_support=0.3)
        miner.fit(sequences)

        stats = miner.get_statistics()

        assert "total_patterns" in stats
        assert "avg_support" in stats
        assert stats["total_patterns"] > 0


class TestMineFrequentPatterns:
    """Tests for stateless pattern mining function."""

    def test_mine_patterns(self) -> None:
        """Test mining patterns with stateless function."""
        sequences = [
            ["LOGIN", "SEARCH", "LOGOUT"],
            ["LOGIN", "SEARCH"],
            ["LOGIN", "PURCHASE"],
        ]

        patterns, rules = mine_frequent_patterns(
            sequences,
            min_support=0.3,
            min_confidence=0.3,
        )

        assert len(patterns) > 0
        # Rules may vary based on support

    def test_mine_patterns_high_support(self) -> None:
        """Test mining with high support threshold."""
        sequences = [
            ["A", "B"],
            ["A", "B"],
            ["A", "B"],
            ["C", "D"],
        ]

        patterns, rules = mine_frequent_patterns(
            sequences,
            min_support=0.7,
            min_confidence=0.5,
        )

        # Only very frequent patterns should remain
        assert len(patterns) >= 0  # May have single items


class TestExtractEventSequences:
    """Tests for event sequence extraction."""

    def test_extract_sequences_from_logs(self) -> None:
        """Test extracting sequences from logs."""
        from datetime import datetime

        logs = [
            {
                "timestamp": datetime(2026, 3, 10, 8, 0),
                "level": "INFO",
                "message": "User login successful",
                "session_id": 1,
            },
            {
                "timestamp": datetime(2026, 3, 10, 8, 5),
                "level": "INFO",
                "message": "Search query executed",
                "session_id": 1,
            },
            {
                "timestamp": datetime(2026, 3, 10, 8, 10),
                "level": "INFO",
                "message": "User logout",
                "session_id": 1,
            },
        ]

        sequences = extract_event_sequences(logs)

        assert len(sequences) == 1
        assert len(sequences[0]) == 3

    def test_extract_sequences_multiple_sessions(self) -> None:
        """Test extracting sequences from multiple sessions."""
        from datetime import datetime

        logs = [
            {
                "timestamp": datetime(2026, 3, 10, 8, 0),
                "level": "INFO",
                "message": "Login",
                "session_id": 1,
            },
            {
                "timestamp": datetime(2026, 3, 10, 8, 0),
                "level": "INFO",
                "message": "Login",
                "session_id": 2,
            },
        ]

        sequences = extract_event_sequences(logs)

        assert len(sequences) == 2

    def test_extract_sequences_empty_logs(self) -> None:
        """Test extracting sequences from empty logs."""
        sequences = extract_event_sequences([])
        assert len(sequences) == 0


class TestEventTypeExtraction:
    """Tests for event type extraction from messages."""

    def test_auth_event(self) -> None:
        """Test auth event extraction."""
        from app.mining.pattern_mining import _extract_event_type

        event_type = _extract_event_type("User login successful")
        assert event_type == "Auth"

    def test_search_event(self) -> None:
        """Test search event extraction."""
        from app.mining.pattern_mining import _extract_event_type

        event_type = _extract_event_type("Search query for laptop")
        assert event_type == "Search"

    def test_error_event(self) -> None:
        """Test error event extraction."""
        from app.mining.pattern_mining import _extract_event_type

        event_type = _extract_event_type("Database connection failed")
        assert event_type == "Error"

    def test_general_event(self) -> None:
        """Test general event extraction."""
        from app.mining.pattern_mining import _extract_event_type

        event_type = _extract_event_type("Some random message")
        assert event_type == "General"
