"""Tests for clustering module."""

from datetime import datetime

import pytest

from app.mining.clustering import LogClusterer, cluster_logs, extract_log_features


class TestLogClusterer:
    """Tests for LogClusterer class."""

    def test_fit_simple_logs(self) -> None:
        """Test fitting on simple logs."""
        logs = [
            {"message": "Database connection error", "level": "ERROR"},
            {"message": "Database timeout", "level": "ERROR"},
            {"message": "User login successful", "level": "INFO"},
            {"message": "User logout", "level": "INFO"},
        ]

        clusterer = LogClusterer(n_clusters=2)
        clusterer.fit(logs)

        clusters = clusterer.get_clusters(logs)

        assert len(clusters) > 0
        assert all("keywords" in c for c in clusters)

    def test_fit_empty_logs(self) -> None:
        """Test fitting on empty logs."""
        clusterer = LogClusterer(n_clusters=2)
        clusterer.fit([])

        clusters = clusterer.get_clusters([])

        assert len(clusters) == 0

    def test_get_statistics(self) -> None:
        """Test getting clustering statistics."""
        logs = [
            {"message": "Error message 1", "level": "ERROR"},
            {"message": "Error message 2", "level": "ERROR"},
            {"message": "Info message 1", "level": "INFO"},
            {"message": "Info message 2", "level": "INFO"},
        ]

        clusterer = LogClusterer(n_clusters=2)
        clusterer.fit(logs)

        stats = clusterer.get_statistics()

        assert "total_clusters" in stats
        assert "avg_cluster_size" in stats

    def test_predict_clusters(self) -> None:
        """Test predicting cluster for new messages."""
        logs = [
            {"message": "Database error", "level": "ERROR"},
            {"message": "Database fail", "level": "ERROR"},
            {"message": "Login success", "level": "INFO"},
            {"message": "Login complete", "level": "INFO"},
        ]

        clusterer = LogClusterer(n_clusters=2)
        clusterer.fit(logs)

        predictions = clusterer.predict(["Database connection error"])

        assert len(predictions) == 1
        assert isinstance(predictions[0], int)


class TestClusterLogs:
    """Tests for stateless clustering function."""

    def test_cluster_logs(self) -> None:
        """Test clustering logs with stateless function."""
        logs = [
            {"message": "Error in database", "level": "ERROR"},
            {"message": "Database timeout", "level": "ERROR"},
            {"message": "User logged in", "level": "INFO"},
            {"message": "User session started", "level": "INFO"},
        ]

        clusters = cluster_logs(logs, n_clusters=2)

        assert len(clusters) > 0
        assert all("log_count" in c for c in clusters)


class TestExtractLogFeatures:
    """Tests for log feature extraction."""

    def test_extract_features(self) -> None:
        """Test extracting features from logs."""
        logs = [
            {"message": "Test message", "level": "INFO", "source": "test"},
            {"message": "Error occurred", "level": "ERROR", "source": "app"},
        ]

        features = extract_log_features(logs)

        assert len(features) == 2
        assert "INFO" in features[0]
        assert "ERROR" in features[1]

    def test_extract_features_empty_logs(self) -> None:
        """Test extracting features from empty logs."""
        features = extract_log_features([])
        assert len(features) == 0


class TestClusterKeywords:
    """Tests for cluster keyword extraction."""

    def test_keywords_extracted(self) -> None:
        """Test that keywords are extracted for clusters."""
        logs = [
            {"message": "Database connection failed error", "level": "ERROR"},
            {"message": "Database timeout error", "level": "ERROR"},
            {"message": "Database retry success", "level": "INFO"},
        ]

        clusterer = LogClusterer(n_clusters=2)
        clusterer.fit(logs)

        clusters = clusterer.get_clusters(logs)

        # At least one cluster should have keywords
        assert any(c.get("keywords") for c in clusters)
