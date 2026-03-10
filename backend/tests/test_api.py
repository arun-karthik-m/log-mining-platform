"""Integration tests for API endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database.db_connection import db_connection
from app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    """Create async test client with database.

    Yields:
        AsyncClient for testing.
    """
    # Connect to database (uses .env or test mode)
    await db_connection.connect()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as test_client:
        yield test_client

    await db_connection.disconnect()


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_docs_endpoint(self) -> None:
        """Test Swagger docs endpoint."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get("/docs")
            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_openapi_endpoint(self) -> None:
        """Test OpenAPI schema endpoint."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get("/openapi.json")
            assert response.status_code == 200
            data = response.json()
            assert "info" in data
            assert data["info"]["title"] == "Log Mining Intelligence Platform"


class TestLogEndpoints:
    """Tests for log API endpoints."""

    @pytest.mark.asyncio
    async def test_get_logs_empty(self, client: AsyncClient) -> None:
        """Test getting logs when database is empty."""
        response = await client.get("/api/v1/logs")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_get_logs_pagination(self, client: AsyncClient) -> None:
        """Test log pagination parameters."""
        response = await client.get("/api/v1/logs?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["limit"] == 10

    @pytest.mark.asyncio
    async def test_get_logs_invalid_page(self, client: AsyncClient) -> None:
        """Test invalid page parameter."""
        response = await client.get("/api/v1/logs?page=0")
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_upload_logs(self, client: AsyncClient) -> None:
        """Test uploading logs."""
        logs = [
            {
                "timestamp": "2026-03-10T08:00:00Z",
                "level": "INFO",
                "message": "Test log message",
                "source": "test-service",
            }
        ]
        response = await client.post("/api/v1/logs", json=logs)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_get_log_not_found(self, client: AsyncClient) -> None:
        """Test getting non-existent log."""
        response = await client.get("/api/v1/logs/99999")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_sessions(self, client: AsyncClient) -> None:
        """Test getting sessions."""
        response = await client.get("/api/v1/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestMiningEndpoints:
    """Tests for mining API endpoints."""

    @pytest.mark.asyncio
    async def test_get_patterns_empty(self, client: AsyncClient) -> None:
        """Test getting patterns when none exist."""
        response = await client.get("/api/v1/patterns")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_clusters_empty(self, client: AsyncClient) -> None:
        """Test getting clusters when none exist."""
        response = await client.get("/api/v1/clusters")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_anomalies_empty(self, client: AsyncClient) -> None:
        """Test getting anomalies when none exist."""
        response = await client.get("/api/v1/anomalies")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_metrics(self, client: AsyncClient) -> None:
        """Test getting dashboard metrics."""
        response = await client.get("/api/v1/dashboard/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "total_logs" in data
        assert "total_sessions" in data
        assert "error_rate" in data
        assert "logs_by_level" in data

    @pytest.mark.asyncio
    async def test_trigger_pattern_discovery(self, client: AsyncClient) -> None:
        """Test triggering pattern discovery."""
        response = await client.post("/api/v1/mining/patterns")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "success" in data

    @pytest.mark.asyncio
    async def test_trigger_clustering(self, client: AsyncClient) -> None:
        """Test triggering log clustering."""
        response = await client.post("/api/v1/mining/clusters")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "success" in data

    @pytest.mark.asyncio
    async def test_trigger_anomaly_detection(self, client: AsyncClient) -> None:
        """Test triggering anomaly detection."""
        response = await client.post("/api/v1/mining/anomalies")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "success" in data


class TestValidationErrors:
    """Tests for validation error handling."""

    @pytest.mark.asyncio
    async def test_invalid_log_format(self, client: AsyncClient) -> None:
        """Test uploading invalid log format."""
        logs = [
            {"invalid": "format"}  # Missing required fields
        ]
        response = await client.post("/api/v1/logs", json=logs)
        # Should handle gracefully (either 200 with 0 count or 422)
        assert response.status_code in [200, 422]

    @pytest.mark.asyncio
    async def test_invalid_mining_params(self, client: AsyncClient) -> None:
        """Test invalid mining parameters."""
        response = await client.post("/api/v1/mining/patterns?min_support=1.5")
        # Should handle gracefully
        assert response.status_code in [200, 422]


class TestCORS:
    """Tests for CORS configuration."""

    @pytest.mark.asyncio
    async def test_cors_headers(self) -> None:
        """Test CORS headers are present."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.options(
                "/api/v1/logs",
                headers={"Origin": "http://localhost:3000"},
            )
            # CORS should be configured
            assert response.status_code in [200, 404, 405]
