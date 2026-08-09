from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LogResponse(BaseModel):
    id: int
    timestamp: Optional[datetime]
    source_ip: Optional[str]
    destination_ip: Optional[str]
    hostname: Optional[str]
    username: Optional[str]
    event_type: Optional[str]
    severity: Optional[str]
    message: Optional[str]
    raw_log: str
    source_format: Optional[str]
    project_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class UploadResponse(BaseModel):
    filename: str
    format_detected: str
    total_lines: int
    parsed_successfully: int
    failed_lines: int
    project_id: int
    inserted_count: int
