"""
detection/rules.py

Rule-based threat detection engine.
"""
from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, asc

from app.models.log import Log

# Case-insensitive keywords indicative of a failed login
FAILED_LOGIN_KEYWORDS = [
    "failed",
    "invalid password",
    "401",
    "denied"
]

def detect_brute_force(db: Session, project_id: int | None = None) -> list[dict]:
    """
    Detects brute force login attempts.
    
    Criteria:
    - 5 or more failed login logs from the same source_ip
    - Within a 5-minute rolling window
    """
    # 1. Base query: fetch potential failed logins
    query = db.query(Log).filter(
        Log.severity.in_(["warning", "error", "critical"]),
        Log.source_ip.isnot(None),
        Log.timestamp.isnot(None)
    )
    
    if project_id is not None:
        query = query.filter(Log.project_id == project_id)
        
    # Build the keyword matching clause
    keyword_clauses = [Log.message.ilike(f"%{kw}%") for kw in FAILED_LOGIN_KEYWORDS]
    query = query.filter(or_(*keyword_clauses))
    
    # Order by timestamp to facilitate sliding window
    query = query.order_by(asc(Log.timestamp))
    
    potential_logs = query.all()
    
    # 2. Group by source_ip
    logs_by_ip = {}
    for log in potential_logs:
        logs_by_ip.setdefault(log.source_ip, []).append(log)
        
    # 3. Detect 5-minute rolling windows with >= 5 attempts
    detections = []
    
    for ip, logs in logs_by_ip.items():
        n = len(logs)
        if n < 5:
            continue
            
        i = 0
        while i <= n - 5:
            start_log = logs[i]
            window_end_time = start_log.timestamp + timedelta(minutes=5)
            
            # Find all logs in this 5 minute window
            window_logs = [start_log]
            j = i + 1
            while j < n and logs[j].timestamp <= window_end_time:
                window_logs.append(logs[j])
                j += 1
                
            if len(window_logs) >= 5:
                # We have a detection
                detections.append({
                    "source_ip": ip,
                    "count": len(window_logs),
                    "start_time": window_logs[0].timestamp,
                    "end_time": window_logs[-1].timestamp,
                    "log_ids": [log.id for log in window_logs]
                })
                # Skip past this window to avoid overlapping duplicate alerts for the same burst
                i = j
            else:
                i += 1
                
    return detections
