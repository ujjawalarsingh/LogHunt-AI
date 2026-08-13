"""
repositories/alert_repository.py

Query functions for the alerts table.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.alert import Alert
from app.models.log import Log


def get_alert_by_id(db: Session, alert_id: int) -> Alert | None:
    return db.query(Alert).filter(Alert.id == alert_id).first()


def get_alerts(
    db: Session,
    project_id: int | None = None,
    alert_type: str | None = None,
    severity: str | None = None,
    skip: int = 0,
    limit: int = 50
) -> list[Alert]:
    query = db.query(Alert)

    if project_id is not None:
        # Filter alerts via the triggering log's project_id
        query = query.join(Log, Alert.log_id == Log.id).filter(Log.project_id == project_id)

    if alert_type is not None:
        query = query.filter(Alert.alert_type == alert_type)

    if severity is not None:
        query = query.filter(Alert.severity == severity)

    return query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()


def count_alerts(
    db: Session,
    project_id: int | None = None,
    alert_type: str | None = None,
    severity: str | None = None,
) -> int:
    query = db.query(func.count(Alert.id))

    if project_id is not None:
        query = query.join(Log, Alert.log_id == Log.id).filter(Log.project_id == project_id)

    if alert_type is not None:
        query = query.filter(Alert.alert_type == alert_type)

    if severity is not None:
        query = query.filter(Alert.severity == severity)

    return query.scalar() or 0


def get_alerts_by_type(db: Session) -> dict[str, int]:
    """Returns a count of alerts grouped by alert_type."""
    rows = (
        db.query(Alert.alert_type, func.count(Alert.id))
        .group_by(Alert.alert_type)
        .all()
    )
    return {row[0]: row[1] for row in rows}


def get_alerts_by_severity(db: Session) -> dict[str, int]:
    """Returns a count of alerts grouped by severity."""
    rows = (
        db.query(Alert.severity, func.count(Alert.id))
        .group_by(Alert.severity)
        .all()
    )
    return {row[0]: row[1] for row in rows}


def get_recent_alerts(db: Session, limit: int = 5) -> list[Alert]:
    """Returns the most recently created alerts."""
    return (
        db.query(Alert)
        .order_by(desc(Alert.created_at))
        .limit(limit)
        .all()
    )
