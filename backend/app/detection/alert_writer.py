"""
detection/alert_writer.py

Writes generated alerts to the database.
"""
import logging
from sqlalchemy.orm import Session
from app.models.alert import Alert

logger = logging.getLogger(__name__)

def write_alerts(db: Session, detections: list[dict], alert_type: str, severity: str, source: str = "rule_engine") -> dict:
    """
    Takes detection dicts and creates Alert database rows idempotently.
    Returns a dict with the list of created alerts and the number skipped.
    """
    alerts_created = []
    skipped_count = 0
    
    for det in detections:
        # Since Alert requires a single log_id foreign key, we link the alert
        # to the final log in the burst that triggered the threshold.
        triggering_log_id = det["log_ids"][-1]
        
        # Check if an alert with the same type, source, and triggering log_id already exists
        existing_alert = db.query(Alert).filter(
            Alert.alert_type == alert_type,
            Alert.source == source,
            Alert.log_id == triggering_log_id
        ).first()
        
        if existing_alert:
            logger.info("Skipped duplicate alert: %s for log_id %s", alert_type, triggering_log_id)
            skipped_count += 1
            continue
        
        description = (
            f"Detected {alert_type} from {det['source_ip']}: "
            f"{det['count']} attempts between {det['start_time']} and {det['end_time']}. "
            f"Triggering log IDs: {det['log_ids']}"
        )
        
        alert = Alert(
            log_id=triggering_log_id,
            alert_type=alert_type,
            source=source,
            severity=severity,
            confidence_score=None,
            description=description
        )
        
        db.add(alert)
        alerts_created.append(alert)
        
    db.commit()
    for a in alerts_created:
        db.refresh(a)
        
    return {
        "created": alerts_created,
        "skipped_count": skipped_count
    }
