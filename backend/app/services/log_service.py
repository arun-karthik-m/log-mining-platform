"""Log service layer for business logic.

Handles:
- Log ingestion
- Log retrieval with filtering
- Session management
"""

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.log_model import Log, Session
from app.preprocessing.log_cleaner import clean_logs, validate_log_entry
from app.preprocessing.log_parser import parse_log_line
from app.preprocessing.session_builder import build_sessions
from utils.logger import setup_logger

logger = setup_logger(__name__)


class LogService:
    """Service for log operations."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize log service.

        Args:
            db_session: SQLAlchemy async session.
        """
        self.db = db_session

    async def ingest_logs(self, logs_data: list[dict[str, Any]]) -> int:
        """Ingest and process logs.

        Args:
            logs_data: List of raw log data (dict or string).

        Returns:
            Number of logs successfully ingested.
        """
        logger.info(f"Starting log ingestion for {len(logs_data)} entries")

        # Step 1: Parse logs
        parsed_logs: list[dict[str, Any]] = []
        for log_data in logs_data:
            if isinstance(log_data, str):
                parsed = parse_log_line(log_data)
            elif isinstance(log_data, dict):
                # Raw text line from file upload
                if "_raw" in log_data:
                    parsed = parse_log_line(log_data["_raw"])
                # Already fully parsed with datetime timestamp
                elif "timestamp" in log_data and isinstance(log_data.get("timestamp"), datetime):
                    parsed = log_data
                # Dict with string timestamp or standard fields - parse as JSON log
                elif any(k in log_data for k in ("timestamp", "time", "@timestamp", "ts", "message", "msg")):
                    from app.preprocessing.log_parser import parse_json_log
                    parsed = parse_json_log(log_data)
                else:
                    parsed = parse_log_line(str(log_data))
            else:
                parsed = parse_log_line(str(log_data))

            parsed_logs.append(parsed)

        # Step 2: Clean logs
        cleaned_logs = clean_logs(parsed_logs)

        # Step 3: Validate logs
        valid_logs: list[dict[str, Any]] = []
        for log in cleaned_logs:
            is_valid, error = validate_log_entry(log)
            if is_valid:
                valid_logs.append(log)
            else:
                logger.warning(f"Invalid log entry: {error}")

        # Step 4: Build sessions
        logs_with_sessions, sessions = build_sessions(valid_logs)

        # Step 5: Save sessions to database and get ID mapping
        session_count, key_to_id = await self._save_sessions(sessions)

        # Step 5b: Update logs with actual database session IDs
        for log_data in logs_with_sessions:
            old_session_id = log_data.get("session_id")
            if old_session_id:
                # Find the session key from sessions list
                for sess in sessions:
                    if sess.get("id") == old_session_id:
                        db_session_id = key_to_id.get(sess["session_key"])
                        if db_session_id:
                            log_data["session_id"] = db_session_id
                        break

        # Step 6: Save logs to database
        log_count = await self._save_logs(logs_with_sessions)

        logger.info(f"Ingested {log_count} logs in {session_count} sessions")
        return log_count

    async def _save_sessions(self, sessions: list[dict[str, Any]]) -> tuple[int, dict[str, int]]:
        """Save sessions to database with upsert handling.

        Args:
            sessions: List of session dictionaries.

        Returns:
            Tuple of (number of sessions saved, mapping of session_key to DB id).
        """
        if not sessions:
            return 0, {}

        from sqlalchemy.dialects.postgresql import insert
        
        key_to_id: dict[str, int] = {}
        
        # Prepare session data for bulk insert
        session_data_list = []
        for session_data in sessions:
            session_data_list.append({
                "session_key": session_data["session_key"],
                "start_time": session_data["start_time"],
                "end_time": session_data.get("end_time"),
                "event_count": session_data.get("event_count", 0),
            })
        
        # Use PostgreSQL INSERT ... ON CONFLICT DO UPDATE
        stmt = insert(Session.__table__).values(session_data_list)
        stmt = stmt.on_conflict_do_update(
            index_elements=["session_key"],
            set_={
                "start_time": stmt.excluded.start_time,
                "end_time": stmt.excluded.end_time,
                "event_count": stmt.excluded.event_count,
            }
        )
        stmt = stmt.returning(Session.__table__.c.session_key, Session.__table__.c.id)
        
        result = await self.db.execute(stmt)
        
        for row in result.all():
            key_to_id[row.session_key] = row.id

        await self.db.flush()
        
        return len(session_data_list), key_to_id

    async def _save_logs(self, logs: list[dict[str, Any]]) -> int:
        """Save logs to database.

        Args:
            logs: List of log dictionaries with session_id.

        Returns:
            Number of logs saved.
        """
        if not logs:
            return 0

        saved_count = 0
        for log_data in logs:
            log = Log(
                timestamp=log_data["timestamp"],
                level=log_data["level"],
                message=log_data["message"],
                source=log_data.get("source"),
                session_id=log_data.get("session_id"),
                metadata_=log_data.get("metadata"),
            )
            self.db.add(log)
            saved_count += 1

        await self.db.flush()
        return saved_count

    async def get_logs(
        self,
        level: Optional[str] = None,
        source: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> tuple[list[Log], int]:
        """Get logs with filtering and pagination.

        Args:
            level: Filter by log level.
            source: Filter by source.
            start_time: Filter by start time.
            end_time: Filter by end time.
            search: Search in message.
            page: Page number.
            limit: Items per page.

        Returns:
            Tuple of (logs list, total count).
        """
        # Build query
        query = select(Log)

        # Apply filters
        if level:
            query = query.where(Log.level == level.upper())
        if source:
            query = query.where(Log.source == source)
        if start_time:
            query = query.where(Log.timestamp >= start_time)
        if end_time:
            query = query.where(Log.timestamp <= end_time)
        if search:
            query = query.where(Log.message.ilike(f"%{search}%"))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (page - 1) * limit
        query = query.order_by(Log.timestamp.desc()).offset(offset).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        logs = result.scalars().all()

        return list(logs), int(total)

    async def get_log_by_id(self, log_id: int) -> Optional[Log]:
        """Get a single log by ID.

        Args:
            log_id: Log ID.

        Returns:
            Log object or None.
        """
        query = select(Log).where(Log.id == log_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_sessions(self) -> list[Session]:
        """Get all sessions.

        Returns:
            List of sessions.
        """
        query = select(Session).order_by(Session.start_time.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_session_by_id(self, session_id: int) -> Optional[Session]:
        """Get a session by ID.

        Args:
            session_id: Session ID.

        Returns:
            Session object or None.
        """
        query = select(Session).where(Session.id == session_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_logs_by_session(self, session_id: int) -> list[Log]:
        """Get all logs for a session.

        Args:
            session_id: Session ID.

        Returns:
            List of logs.
        """
        query = select(Log).where(Log.session_id == session_id).order_by(Log.timestamp)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_metrics(self) -> dict[str, Any]:
        """Get log metrics.

        Returns:
            Dictionary with metrics.
        """
        # Total logs
        total_logs_query = select(func.count(Log.id))
        total_logs_result = await self.db.execute(total_logs_query)
        total_logs = total_logs_result.scalar() or 0

        # Total sessions
        total_sessions_query = select(func.count(Session.id))
        total_sessions_result = await self.db.execute(total_sessions_query)
        total_sessions = total_sessions_result.scalar() or 0

        # Logs by level
        level_query = select(Log.level, func.count(Log.id)).group_by(Log.level)
        level_result = await self.db.execute(level_query)
        logs_by_level = {row[0]: row[1] for row in level_result.all()}

        # Error rate
        error_count = logs_by_level.get("ERROR", 0) + logs_by_level.get("CRITICAL", 0)
        error_rate = (error_count / total_logs * 100) if total_logs > 0 else 0

        return {
            "total_logs": total_logs,
            "total_sessions": total_sessions,
            "total_patterns": 0,  # Will be populated by mining service
            "total_anomalies": 0,  # Will be populated by mining service
            "error_rate": round(error_rate, 2),
            "logs_by_level": logs_by_level,
        }

    async def delete_all_logs(self) -> int:
        """Delete all logs (for testing).

        Returns:
            Number of logs deleted.
        """
        from sqlalchemy import delete

        query = delete(Log)
        result = await self.db.execute(query)
        await self.db.flush()
        return result.rowcount or 0
