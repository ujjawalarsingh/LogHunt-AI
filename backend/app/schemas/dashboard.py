"""
schemas/dashboard.py

Pydantic response schemas for dashboard and list endpoints.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RecentAlertItem(BaseModel):
    id: int
    alert_type: str
    severity: str
    description: str
    created_at: datetime
    log_id: int

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_logs: int
    total_alerts: int
    alerts_by_type: dict[str, int]
    alerts_by_severity: dict[str, int]
    recent_alerts: list[RecentAlertItem]


class LogListItem(BaseModel):
    id: int
    timestamp: Optional[datetime]
    source_ip: Optional[str]
    username: Optional[str]
    event_type: Optional[str]
    severity: Optional[str]
    message: Optional[str]
    source_format: Optional[str]
    project_id: Optional[int]

    class Config:
        from_attributes = True


class LogListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[LogListItem]


class AlertListItem(BaseModel):
    id: int
    alert_type: str
    source: str
    severity: str
    confidence_score: Optional[float]
    description: str
    created_at: datetime
    log_id: int

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[AlertListItem]
