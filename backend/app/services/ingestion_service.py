import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.project import Project
from app.parser.detector import detect_and_parse, UnknownLogFormatError
from app.repositories.log_repository import bulk_insert_logs
from app.schemas.log import UploadResponse

logger = logging.getLogger(__name__)

def process_log_file(db: Session, file_content: str, filename: str, project_id: int = None) -> UploadResponse:
    """
    Orchestrates the log ingestion pipeline:
    1. Ensures a Project exists (creates one if not provided).
    2. Parses the log file (auto-detecting format).
    3. Persists the parsed entries to the database.
    4. Returns a summary of the operation.
    """
    # 1. Project Management
    if not project_id:
        # Create a new project automatically
        project_name = f"Upload {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        project = Project(name=project_name)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id

    # 2. Parsing (let UnknownLogFormatError bubble up)
    entries = detect_and_parse(file_content, filename=filename)

    if not entries:
        return UploadResponse(
            filename=filename,
            format_detected="unknown",
            total_lines=0,
            parsed_successfully=0,
            failed_lines=0,
            project_id=project_id,
            inserted_count=0
        )

    format_detected = entries[0].source_format if entries else "unknown"

    # A line is considered 'failed' if the parser couldn't extract any meaningful data
    # beyond the raw_log and source_format fields.
    failed_lines = sum(
        1 for e in entries
        if e.timestamp is None and e.source_ip is None and e.destination_ip is None
        and e.hostname is None and e.username is None and e.event_type is None
        and e.severity is None and e.message is None
    )

    parsed_successfully = len(entries) - failed_lines

    # 3. Persistence
    inserted_count = bulk_insert_logs(db, entries, project_id)

    # 4. Return Summary
    return UploadResponse(
        filename=filename,
        format_detected=format_detected,
        total_lines=len(entries),
        parsed_successfully=parsed_successfully,
        failed_lines=failed_lines,
        project_id=project_id,
        inserted_count=inserted_count
    )
