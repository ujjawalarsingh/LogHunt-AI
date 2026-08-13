"""Test script for the GET /alerts/{alert_id}/explain endpoint."""
import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.repositories.alert_repository import get_alerts

c = TestClient(app)

# Fetch 3 real alert IDs from the DB
db = SessionLocal()
alerts = get_alerts(db, limit=3)
db.close()

if not alerts:
    print("No alerts found in the database to test.")
    exit(0)

for alert in alerts:
    print(f"\n{'='*50}")
    print(f"=== Testing Alert ID: {alert.id} ===")
    print(f"Data: Type={alert.alert_type}, Severity={alert.severity}, Desc={alert.description[:60]}...")
    
    r = c.get(f"/alerts/{alert.id}/explain")
    print(f"Status: {r.status_code}")
    try:
        data = r.json()
        if "explanation" in data:
            print("\n--- Explanation ---")
            print(data["explanation"])
            print("-------------------")
        else:
            print(data)
    except:
        print(r.text)

# Test missing alert
print(f"\n{'='*50}")
print("=== Testing Alert ID: 999999 (should be 404) ===")
r = c.get("/alerts/999999/explain")
print(f"Status: {r.status_code}")
print(r.json())
