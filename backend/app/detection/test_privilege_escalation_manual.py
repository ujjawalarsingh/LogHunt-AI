"""
test_privilege_escalation_manual.py

Manual test for privilege escalation detection and idempotency.

Run from inside backend/ with the venv active:

    python app/detection/test_privilege_escalation_manual.py
"""
import sys
from pathlib import Path

# Make `app` importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.database import SessionLocal
from app.detection.rules import detect_privilege_escalation
from app.detection.alert_writer import write_alerts
from app.models.alert import Alert

def run_test_pass(db, pass_num: int):
    print(f"\n{'='*50}")
    print(f"--- Running Privilege Escalation Detection (Pass {pass_num}) ---")
    detections = detect_privilege_escalation(db)
    
    if not detections:
        print("No privilege escalation detected.")
        return False
        
    print(f"Found {len(detections)} privilege escalation instances:")
    for i, det in enumerate(detections, 1):
        print(f"  [{i}] Identity: {det['source_ip']}")
        print(f"      Time: {det['start_time']}")
        print(f"      Log IDs: {det['log_ids']}")
        
    print("\n--- Writing Alerts ---")
    result = write_alerts(db, detections, alert_type="privilege_escalation")
    alerts = result["created"]
    skipped = result["skipped_count"]
    
    print(f"Newly created {len(alerts)} alerts.")
    print(f"Skipped {skipped} duplicate alerts.\n")
    
    if alerts:
        print("--- Verifying Newly Created Alerts in DB ---")
        db_alerts = db.query(Alert).filter(Alert.id.in_([a.id for a in alerts])).all()
        for a in db_alerts:
            print(f"Alert ID: {a.id}")
            print(f"  Type: {a.alert_type}")
            print(f"  Source: {a.source}")
            print(f"  Severity: {a.severity}")
            print(f"  Log ID (Trigger): {a.log_id}")
            print(f"  Description: {a.description}")
            print()
            
    return True

def main():
    db = SessionLocal()
    try:
        # First pass to detect and create alerts
        found = run_test_pass(db, 1)
        
        # Second pass to prove dedup works immediately
        if found:
            run_test_pass(db, 2)
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
