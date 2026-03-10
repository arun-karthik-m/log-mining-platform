"""Mining routes for FastAPI application."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db_connection import get_db_session
from app.models.schemas import (
    AnomalyResponse,
    ClusterResponse,
    MetricsResponse,
    PatternResponse,
)
from app.services.mining_service import MiningService

router = APIRouter()


def get_mining_service(db: AsyncSession = Depends(get_db_session)) -> MiningService:
    """Get mining service instance.

    Args:
        db: Database session.

    Returns:
        MiningService instance.
    """
    return MiningService(db)


@router.post("/mining/patterns")
async def trigger_pattern_discovery(
    min_support: float = 0.1,
    min_confidence: float = 0.5,
    service: MiningService = Depends(get_mining_service),
) -> dict[str, Any]:
    """Trigger pattern discovery.

    Args:
        min_support: Minimum support threshold
        min_confidence: Minimum confidence threshold
        service: Mining service

    Returns:
        Count of patterns discovered
    """
    count = await service.discover_patterns(
        min_support=min_support,
        min_confidence=min_confidence,
    )
    return {"count": count, "success": True}


@router.get("/patterns", response_model=list[PatternResponse])
async def get_patterns(
    service: MiningService = Depends(get_mining_service),
) -> list[Any]:
    """Get all discovered patterns.

    Args:
        service: Mining service

    Returns:
        List of patterns
    """
    return await service.get_patterns()


@router.post("/mining/clusters")
async def trigger_clustering(
    n_clusters: int = 5,
    service: MiningService = Depends(get_mining_service),
) -> dict[str, Any]:
    """Trigger log clustering.

    Args:
        n_clusters: Number of clusters
        service: Mining service

    Returns:
        Count of clusters created
    """
    count = await service.cluster_logs(n_clusters=n_clusters)
    return {"count": count, "success": True}


@router.get("/clusters", response_model=list[ClusterResponse])
async def get_clusters(
    service: MiningService = Depends(get_mining_service),
) -> list[Any]:
    """Get all clusters.

    Args:
        service: Mining service

    Returns:
        List of clusters
    """
    return await service.get_clusters()


@router.post("/mining/anomalies")
async def trigger_anomaly_detection(
    contamination: float = 0.1,
    service: MiningService = Depends(get_mining_service),
) -> dict[str, Any]:
    """Trigger anomaly detection.

    Args:
        contamination: Expected proportion of anomalies
        service: Mining service

    Returns:
        Count of anomalies detected
    """
    count = await service.detect_anomalies_task(contamination=contamination)
    return {"count": count, "success": True}


@router.get("/anomalies", response_model=list[AnomalyResponse])
async def get_anomalies(
    service: MiningService = Depends(get_mining_service),
) -> list[Any]:
    """Get all detected anomalies.

    Args:
        service: Mining service

    Returns:
        List of anomalies
    """
    return await service.get_anomalies()


@router.get("/dashboard/metrics", response_model=MetricsResponse)
async def get_metrics(
    service: MiningService = Depends(get_mining_service),
) -> dict[str, Any]:
    """Get dashboard metrics including mining results.

    Args:
        service: Mining service

    Returns:
        Dictionary with metrics
    """
    from sqlalchemy import case, cast, func, select, Integer

    from app.models.log_model import Log, Session

    # Basic log metrics
    total_logs_query = select(func.count(Log.id))
    total_logs_result = await service.db.execute(total_logs_query)
    total_logs = total_logs_result.scalar() or 0

    total_sessions_query = select(func.count(Session.id))
    total_sessions_result = await service.db.execute(total_sessions_query)
    total_sessions = total_sessions_result.scalar() or 0

    # Logs by level
    level_query = select(Log.level, func.count(Log.id)).group_by(Log.level)
    level_result = await service.db.execute(level_query)
    logs_by_level = {row[0]: row[1] for row in level_result.all()}

    # Error rate
    error_count = logs_by_level.get("ERROR", 0) + logs_by_level.get("CRITICAL", 0)
    error_rate = (error_count / total_logs * 100) if total_logs > 0 else 0

    # Mining metrics
    mining_metrics = await service.get_mining_metrics()

    # Hourly activity (last 24 hours of data, grouped by hour)
    hour_expr = func.extract("hour", Log.timestamp)
    is_error = case(
        (Log.level.in_(["ERROR", "CRITICAL"]), 1),
        else_=0,
    )
    hourly_query = (
        select(
            cast(hour_expr, Integer).label("hour"),
            func.count(Log.id).label("logs"),
            func.sum(is_error).label("errors"),
        )
        .group_by("hour")
        .order_by("hour")
    )
    hourly_result = await service.db.execute(hourly_query)
    hourly_rows = hourly_result.all()

    # Build full 24-hour array (fill gaps with 0)
    hourly_map = {int(row[0]): {"logs": int(row[1]), "errors": int(row[2])} for row in hourly_rows}
    hourly_activity = [
        {"hour": f"{h}:00", "logs": hourly_map.get(h, {}).get("logs", 0), "errors": hourly_map.get(h, {}).get("errors", 0)}
        for h in range(24)
    ]

    return {
        "total_logs": total_logs,
        "total_sessions": total_sessions,
        "total_patterns": mining_metrics["total_patterns"],
        "total_anomalies": mining_metrics["total_anomalies"],
        "error_rate": round(error_rate, 2),
        "logs_by_level": logs_by_level,
        "hourly_activity": hourly_activity,
    }
