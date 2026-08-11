from sqlalchemy.orm import Session
from app.models.log import Log
from app.parser.base import ParsedLogEntry

def bulk_insert_logs(db: Session, entries: list[ParsedLogEntry], project_id: int) -> int:
    """
    Bulk insert a list of ParsedLogEntry objects into the logs table.
    Returns the number of inserted rows.
    """
    logs = [
        Log(
            raw_log=entry.raw_log,
            timestamp=entry.timestamp,
            source_ip=entry.source_ip,
            destination_ip=entry.destination_ip,
            hostname=entry.hostname,
            username=entry.username,
            event_type=entry.event_type,
            severity=entry.severity,
            message=entry.message,
            source_format=entry.source_format,
            project_id=project_id
        )
        for entry in entries
    ]
    
    # Use add_all for efficient bulk insertion
    db.add_all(logs)
    db.commit()
    
    return len(logs)


def get_log_by_id(db: Session, log_id: int) -> Log | None:
    """Return a single Log row by primary key, or None if not found."""
    return db.query(Log).filter(Log.id == log_id).first()
