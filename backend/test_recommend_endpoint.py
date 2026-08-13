"""Test script for the GET /alerts/{alert_id}/recommend endpoint."""
import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.repositories.alert_repository import get_alerts

c = TestClient(app)

db = SessionLocal()
all_alerts = get_alerts(db, limit=50)
db.close()

if not all_alerts:
    print("No alerts found in the database to test.")
    exit(0)

# Try to find one brute force and one privilege escalation
types_tested = set()
test_alerts = []

for alert in all_alerts:
    if alert.alert_type not in types_tested:
        types_tested.add(alert.alert_type)
        test_alerts.append(alert)
        if len(types_tested) == 2:
            break

for alert in test_alerts:
    print(f"\n{'='*50}")
    print(f"=== Testing Alert ID: {alert.id} ===")
    print(f"Data: Type={alert.alert_type}, Severity={alert.severity}, Desc={alert.description[:60]}...")
    
    r = c.get(f"/alerts/{alert.id}/recommend")
    print(f"Status: {r.status_code}")
    try:
        data = r.json()
        if "recommendation" in data:
            print("\n--- Recommendation ---")
            print(data["recommendation"])
            print("-------------------")
        else:
            print(data)
    except:
        print(r.text)

# Test missing alert
print(f"\n{'='*50}")
print("=== Testing Alert ID: 999999 (should be 404) ===")
r = c.get("/alerts/999999/recommend")
print(f"Status: {r.status_code}")
print(r.json())
