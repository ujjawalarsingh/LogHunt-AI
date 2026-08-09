"""
test_brute_force_manual.py

Manual test for the brute force detection rule and alert writer.

Run from inside backend/ with the venv active:

    python app/detection/test_brute_force_manual.py
"""
import sys
from pathlib import Path

# Make `app` importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.database import SessionLocal
from app.detection.rules import detect_brute_force
from app.detection.alert_writer import write_alerts
from app.models.alert import Alert

def main():
    db = SessionLocal()
    try:
        print("--- Running Brute Force Detection ---")
        detections = detect_brute_force(db)
        
        if not detections:
            print("No brute force detected.")
            return
            
        print(f"Found {len(detections)} brute force instances:")
        for i, det in enumerate(detections, 1):
            print(f"  [{i}] IP: {det['source_ip']} - {det['count']} attempts")
            print(f"      Time Window: {det['start_time']} to {det['end_time']}")
            print(f"      Log IDs: {det['log_ids']}")
            
        print("\n--- Writing Alerts ---")
        result = write_alerts(db, detections, alert_type="brute_force")
        alerts = result["created"]
        skipped = result["skipped_count"]
        
        print(f"Newly created {len(alerts)} alerts.")
        print(f"Skipped {skipped} duplicate alerts.\n")
        
        if alerts:
            print("--- Verifying Newly Created Alerts in DB ---")
            # Re-query alerts
            db_alerts = db.query(Alert).filter(Alert.id.in_([a.id for a in alerts])).all()
            for a in db_alerts:
                print(f"Alert ID: {a.id}")
                print(f"  Type: {a.alert_type}")
                print(f"  Source: {a.source}")
                print(f"  Severity: {a.severity}")
                print(f"  Log ID (Trigger): {a.log_id}")
                print(f"  Description: {a.description}")
                print()
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
