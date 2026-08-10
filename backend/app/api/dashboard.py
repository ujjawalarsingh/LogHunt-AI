"""
api/dashboard.py

Read-only dashboard and data list endpoints.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.log import Log
from app.repositories import alert_repository
from app.schemas.dashboard import (
    DashboardSummary,
    LogListResponse,
    LogListItem,
    AlertListResponse,
    AlertListItem,
)

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    """
    Returns a summary of all logs and alerts from the database.
    All numbers are computed from real queries — if the DB is empty,
    zero/empty values are returned honestly.
    """
    total_logs = db.query(func.count(Log.id)).scalar() or 0
    total_alerts = alert_repository.count_alerts(db)
    alerts_by_type = alert_repository.get_alerts_by_type(db)
    alerts_by_severity = alert_repository.get_alerts_by_severity(db)
    recent = alert_repository.get_recent_alerts(db, limit=5)

    return DashboardSummary(
        total_logs=total_logs,
        total_alerts=total_alerts,
        alerts_by_type=alerts_by_type,
        alerts_by_severity=alerts_by_severity,
        recent_alerts=recent,
    )


@router.get("/logs", response_model=LogListResponse)
def list_logs(
    project_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Returns a paginated list of log entries.
    Optionally filter by project_id.
    """
    query = db.query(Log)
    if project_id is not None:
        query = query.filter(Log.project_id == project_id)

    total = query.count()
    rows = query.order_by(Log.id.desc()).offset(skip).limit(limit).all()

    return LogListResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[LogListItem.model_validate(r) for r in rows],
    )


@router.get("/alerts", response_model=AlertListResponse)
def list_alerts(
    project_id: int | None = Query(default=None),
    alert_type: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Returns a paginated list of alerts.
    Optionally filter by project_id, alert_type, or severity.
    """
    total = alert_repository.count_alerts(
        db, project_id=project_id, alert_type=alert_type, severity=severity
    )
    rows = alert_repository.get_alerts(
        db,
        project_id=project_id,
        alert_type=alert_type,
        severity=severity,
        skip=skip,
        limit=limit,
    )

    return AlertListResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[AlertListItem.model_validate(r) for r in rows],
    )
