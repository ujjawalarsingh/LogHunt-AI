"""Quick test for dashboard endpoints."""
import json
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)

print("=== GET /dashboard ===")
r = c.get("/dashboard")
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2, default=str))

print("\n=== GET /logs?limit=3 ===")
r = c.get("/logs?limit=3")
print(f"Status: {r.status_code}")
data = r.json()
print(f"total={data['total']}, returned={len(data['items'])}")
for item in data["items"][:2]:
    print(f"  id={item['id']} severity={item['severity']} username={item['username']} source_ip={item['source_ip']}")

print("\n=== GET /alerts?limit=3 ===")
r = c.get("/alerts?limit=3")
print(f"Status: {r.status_code}")
data = r.json()
print(f"total={data['total']}, returned={len(data['items'])}")
for item in data["items"][:3]:
    print(f"  id={item['id']} type={item['alert_type']} severity={item['severity']}")

print("\n=== GET /alerts?alert_type=brute_force ===")
r = c.get("/alerts?alert_type=brute_force")
print(f"Status: {r.status_code}, total={r.json()['total']}")

print("\n=== GET /alerts?severity=critical ===")
r = c.get("/alerts?severity=critical")
print(f"Status: {r.status_code}, total={r.json()['total']}")
