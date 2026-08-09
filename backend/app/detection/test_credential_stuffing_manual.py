"""
test_credential_stuffing_manual.py

Manual test for credential stuffing detection and idempotency.

Run from inside backend/ with the venv active:

    python app/detection/test_credential_stuffing_manual.py
"""
import sys
from pathlib import Path

# Make `app` importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.database import SessionLocal
from app.detection.rules import detect_credential_stuffing
from app.detection.alert_writer import write_alerts
from app.models.alert import Alert

def run_test_pass(db, pass_num: int):
    print(f"\n{'='*50}")
    print(f"--- Running Credential Stuffing Detection (Pass {pass_num}) ---")
    detections = detect_credential_stuffing(db)
    
    if not detections:
        print("No credential stuffing detected.")
        return False
        
    print(f"Found {len(detections)} credential stuffing instances:")
    for i, det in enumerate(detections, 1):
        print(f"  [{i}] IP: {det['source_ip']} - {det['count']} prior failed attempts")
        print(f"      Time Window: {det['start_time']} to {det['end_time']}")
        print(f"      Log IDs: {det['log_ids']}")
        
    print("\n--- Writing Alerts ---")
    result = write_alerts(db, detections, alert_type="credential_stuffing")
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
