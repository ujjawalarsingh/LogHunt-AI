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

# Case-insensitive keywords indicative of a successful login
SUCCESSFUL_LOGIN_KEYWORDS = [
    "accepted password",
    "login successful",
    "session opened"
]

# Case-insensitive keywords indicative of privilege escalation
PRIVILEGE_ESCALATION_KEYWORDS = [
    "sudo",
    "elevated to admin",
    "role_change",
    "user=root",
    "privilege",
    "escalat"
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

def detect_credential_stuffing(db: Session, project_id: int | None = None) -> list[dict]:
    """
    Detects credential stuffing.
    
    Criteria:
    - A successful login
    - Preceded by 3 or more failed login attempts from the SAME source_ip
    - Within the 10 minutes immediately before the successful login
    """
    # 1. Fetch successful logins
    success_clauses = [Log.message.ilike(f"%{kw}%") for kw in SUCCESSFUL_LOGIN_KEYWORDS]
    success_query = db.query(Log).filter(
        Log.source_ip.isnot(None),
        Log.timestamp.isnot(None),
        or_(*success_clauses)
    )
    if project_id is not None:
        success_query = success_query.filter(Log.project_id == project_id)
        
    successful_logs = success_query.order_by(asc(Log.timestamp)).all()
    
    if not successful_logs:
        return []
        
    # 2. Fetch failed logins (reuse FAILED_LOGIN_KEYWORDS)
    failed_clauses = [Log.message.ilike(f"%{kw}%") for kw in FAILED_LOGIN_KEYWORDS]
    failed_query = db.query(Log).filter(
        Log.source_ip.isnot(None),
        Log.timestamp.isnot(None),
        Log.severity.in_(["warning", "error", "critical"]),
        or_(*failed_clauses)
    )
    if project_id is not None:
        failed_query = failed_query.filter(Log.project_id == project_id)
        
    failed_logs = failed_query.order_by(asc(Log.timestamp)).all()
    
    # Group failed logs by source_ip
    failed_by_ip = {}
    for log in failed_logs:
        failed_by_ip.setdefault(log.source_ip, []).append(log)
        
    detections = []
    
    for success_log in successful_logs:
        ip = success_log.source_ip
        if ip not in failed_by_ip:
            continue
            
        # Check for 3+ failed logins from this IP within 10 minutes before the success
        window_start = success_log.timestamp - timedelta(minutes=10)
        window_end = success_log.timestamp
        
        prior_fails = [
            f for f in failed_by_ip[ip] 
            if window_start <= f.timestamp <= window_end and f.id != success_log.id
        ]
        
        if len(prior_fails) >= 3:
            log_ids = [f.id for f in prior_fails] + [success_log.id]
            detections.append({
                "source_ip": ip,
                "count": len(prior_fails),
                "start_time": prior_fails[0].timestamp,
                "end_time": success_log.timestamp,
                "log_ids": log_ids
            })
            
    return detections

def detect_privilege_escalation(db: Session, project_id: int | None = None) -> list[dict]:
    """
    Detects privilege escalation.
    
    Criteria:
    - Log message or event_type matches privilege escalation keywords
    - Username is present
    - Single log line is sufficient (no time window aggregation)
    """
    clauses = [Log.message.ilike(f"%{kw}%") for kw in PRIVILEGE_ESCALATION_KEYWORDS]
    clauses.extend([Log.event_type.ilike(f"%{kw}%") for kw in PRIVILEGE_ESCALATION_KEYWORDS])
    
    query = db.query(Log).filter(
        Log.username.isnot(None),
        Log.timestamp.isnot(None),
        or_(*clauses)
    )
    
    if project_id is not None:
        query = query.filter(Log.project_id == project_id)
        
    logs = query.order_by(asc(Log.timestamp)).all()
    
    detections = []
    
    for log in logs:
        # Format the identity string for the alert writer
        identity = log.username
        if log.source_ip:
            identity = f"{log.username} (IP: {log.source_ip})"
            
        detections.append({
            "source_ip": identity,  # Overloading source_ip field for alert_writer compatibility
            "count": 1,
            "start_time": log.timestamp,
            "end_time": log.timestamp,
            "log_ids": [log.id]
        })
        
    return detections


