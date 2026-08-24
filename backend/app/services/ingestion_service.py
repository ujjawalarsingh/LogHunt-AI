import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.project import Project
from app.parser.detector import detect_and_parse, UnknownLogFormatError
from app.repositories.log_repository import bulk_insert_logs
from app.schemas.log import UploadResponse
from app.detection.rules import detect_brute_force, detect_credential_stuffing, detect_privilege_escalation
from app.detection.alert_writer import write_alerts

logger = logging.getLogger(__name__)

def process_log_file(db: Session, file_content: str, filename: str, project_id: int = None) -> UploadResponse:
    """
    Orchestrates the log ingestion pipeline:
    1. Ensures a Project exists (creates one if not provided).
    2. Parses the log file (auto-detecting format).
    3. Persists the parsed entries to the database.
    4. Runs the rule-based detection engine (brute force, credential stuffing,
       privilege escalation) and writes any alerts to the database.
    5. Returns a summary of the operation.
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

    # 4. Detection — run all rule-engine detectors on the newly inserted project
    try:
        bf_detections  = detect_brute_force(db, project_id=project_id)
        cs_detections  = detect_credential_stuffing(db, project_id=project_id)
        pe_detections  = detect_privilege_escalation(db, project_id=project_id)

        write_alerts(db, bf_detections,  alert_type="brute_force")
        write_alerts(db, cs_detections,  alert_type="credential_stuffing")
        write_alerts(db, pe_detections,  alert_type="privilege_escalation")

        logger.info(
            "Detection complete for project %s: %d BF, %d CS, %d PE detections.",
            project_id, len(bf_detections), len(cs_detections), len(pe_detections),
        )
    except Exception as exc:
        # Detection failure must NOT roll back the successfully ingested logs.
        logger.error("Detection step failed for project %s: %s", project_id, exc)

    # 5. Return Summary
    return UploadResponse(
        filename=filename,
        format_detected=format_detected,
        total_lines=len(entries),
        parsed_successfully=parsed_successfully,
        failed_lines=failed_lines,
        project_id=project_id,
        inserted_count=inserted_count
    )
