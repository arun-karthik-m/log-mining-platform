"""Log routes for FastAPI application."""

import csv
import io
import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db_connection import get_db_session
from app.models.schemas import (
    LogList,
    LogResponse,
    SessionResponse,
    UploadResponse,
)
from app.services.log_service import LogService
from utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter()


def get_log_service(db: AsyncSession = Depends(get_db_session)) -> LogService:
    """Get log service instance."""
    return LogService(db)


@router.get("/logs", response_model=LogList)
async def get_logs(
    level: str | None = Query(None, description="Filter by log level"),
    source: str | None = Query(None, description="Filter by source"),
    start_time: datetime | None = Query(None, description="Filter by start time"),
    end_time: datetime | None = Query(None, description="Filter by end time"),
    search: str | None = Query(None, description="Search in message"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    service: LogService = Depends(get_log_service),
) -> dict[str, Any]:
    """Get logs with optional filtering and pagination."""
    logs, total = await service.get_logs(
        level=level,
        source=source,
        start_time=start_time,
        end_time=end_time,
        search=search,
        page=page,
        limit=limit,
    )

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/logs/{log_id}", response_model=LogResponse)
async def get_log(
    log_id: int,
    service: LogService = Depends(get_log_service),
) -> LogResponse:
    """Get a single log by ID."""
    log = await service.get_log_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return log


@router.post("/logs", response_model=UploadResponse)
async def upload_logs_json(
    body: dict[str, Any],
    service: LogService = Depends(get_log_service),
) -> UploadResponse:
    """Upload new logs via JSON body.

    Accepts: { "logs": [...] } or a raw list of log objects.
    """
    # Support both { "logs": [...] } and raw list
    if "logs" in body:
        logs_data = body["logs"]
    else:
        logs_data = [body]

    if not isinstance(logs_data, list):
        raise HTTPException(status_code=400, detail="Expected a list of log entries")

    count = await service.ingest_logs(logs_data)

    return UploadResponse(count=count, success=True)


@router.post("/logs/upload", response_model=UploadResponse)
async def upload_log_file(
    file: UploadFile = File(...),
    service: LogService = Depends(get_log_service),
) -> UploadResponse:
    """Upload a log file for analysis.

    Supported formats: .json, .log, .txt, .csv
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    filename = file.filename.lower()
    content = await file.read()

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not decode file content")

    logs_data: list[dict[str, Any]] = []

    if filename.endswith(".json"):
        logs_data = _parse_json_file(text)
    elif filename.endswith(".csv"):
        logs_data = _parse_csv_file(text)
    elif filename.endswith((".log", ".txt")):
        logs_data = _parse_text_file(text)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported: .json, .csv, .log, .txt",
        )

    if not logs_data:
        raise HTTPException(status_code=400, detail="No valid log entries found in file")

    logger.info(f"Parsed {len(logs_data)} entries from {file.filename}")

    count = await service.ingest_logs(logs_data)

    return UploadResponse(count=count, success=True)


@router.post("/logs/webhook", response_model=UploadResponse)
async def webhook_ingest(
    body: dict[str, Any] | list[dict[str, Any]],
    service: LogService = Depends(get_log_service),
) -> UploadResponse:
    """Webhook endpoint for external log sources to push logs.

    Accepts a single log object or a list of log objects.
    Also accepts { "logs": [...] } format.
    """
    if isinstance(body, list):
        logs_data = body
    elif isinstance(body, dict) and "logs" in body:
        logs_data = body["logs"]
    else:
        logs_data = [body]

    count = await service.ingest_logs(logs_data)

    return UploadResponse(count=count, success=True)


@router.get("/sessions", response_model=list[SessionResponse])
async def get_sessions(
    service: LogService = Depends(get_log_service),
) -> list[SessionResponse]:
    """Get all sessions."""
    return await service.get_sessions()


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    service: LogService = Depends(get_log_service),
) -> SessionResponse:
    """Get a session by ID."""
    session = await service.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions/{session_id}/logs", response_model=list[LogResponse])
async def get_session_logs(
    session_id: int,
    service: LogService = Depends(get_log_service),
) -> list[LogResponse]:
    """Get all logs for a session."""
    return await service.get_logs_by_session(session_id)


# ── File parsing helpers ──────────────────────────────


def _parse_json_file(text: str) -> list[dict[str, Any]]:
    """Parse a JSON file containing logs."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        # Check for common wrapper keys
        for key in ["logs", "events", "records", "data", "items"]:
            if key in data and isinstance(data[key], list):
                return data[key]
        return [data]
    else:
        raise HTTPException(status_code=400, detail="JSON must be an array or object")


def _parse_csv_file(text: str) -> list[dict[str, Any]]:
    """Parse a CSV file containing logs."""
    logs = []
    reader = csv.DictReader(io.StringIO(text))

    for row in reader:
        log_entry: dict[str, Any] = {}

        # Map common CSV column names
        for ts_key in ["timestamp", "time", "datetime", "date", "ts", "@timestamp"]:
            if ts_key in row and row[ts_key]:
                log_entry["timestamp"] = row[ts_key]
                break

        for lvl_key in ["level", "severity", "log_level", "loglevel", "priority"]:
            if lvl_key in row and row[lvl_key]:
                log_entry["level"] = row[lvl_key]
                break

        for msg_key in ["message", "msg", "text", "log", "content", "description"]:
            if msg_key in row and row[msg_key]:
                log_entry["message"] = row[msg_key]
                break

        for src_key in ["source", "service", "logger", "component", "host", "hostname"]:
            if src_key in row and row[src_key]:
                log_entry["source"] = row[src_key]
                break

        if "message" not in log_entry:
            # Use all fields as the message
            log_entry["message"] = " | ".join(f"{k}={v}" for k, v in row.items() if v)

        if log_entry.get("message"):
            logs.append(log_entry)

    return logs


def _parse_text_file(text: str) -> list[dict[str, Any]]:
    """Parse a plain text log file (one log per line)."""
    logs = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Try JSON line format first
        if line.startswith("{"):
            try:
                log_dict = json.loads(line)
                if isinstance(log_dict, dict):
                    logs.append(log_dict)
                    continue
            except json.JSONDecodeError:
                pass

        # Fall back to string-based parsing (will be handled by log_parser)
        logs.append({"_raw": line})

    return logs
