"""WebSocket connection manager for live log streaming."""

import json
from datetime import datetime
from typing import Any

from fastapi import WebSocket

from utils.logger import setup_logger

logger = setup_logger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for live log streaming."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast_log(self, log_data: dict[str, Any]) -> None:
        """Broadcast a single log entry to all connected clients."""
        message = self._serialize_log(log_data)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_logs(self, logs: list[dict[str, Any]]) -> None:
        """Broadcast multiple log entries to all connected clients."""
        for log_data in logs:
            await self.broadcast_log(log_data)

    def _serialize_log(self, log_data: dict[str, Any]) -> str:
        """Serialize log data to JSON string."""
        serializable = {}
        for key, value in log_data.items():
            if isinstance(value, datetime):
                serializable[key] = value.isoformat()
            else:
                serializable[key] = value
        return json.dumps(serializable)


# Global connection manager instance
ws_manager = ConnectionManager()
