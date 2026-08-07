from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class LogBase(BaseModel):
    timestamp: Optional[datetime] = None
    source_ip: Optional[str] = None
    raw_log: str
    parsed_data: Optional[Dict[str, Any]] = None
    threat_type: Optional[str] = None
    severity: Optional[str] = None

class LogCreate(LogBase):
    pass

class LogSchema(LogBase):
    id: int

    class Config:
        from_attributes = True

class AnalyzeResponse(BaseModel):
    status: str
    total_logs_analyzed: int
    threats_detected: int
    critical_count: int
    threat_summary: List[Any]
    all_logs: List[LogBase]
