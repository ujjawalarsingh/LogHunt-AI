"""Smoke test for the POST /classify endpoint via FastAPI TestClient."""
import json
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)

print("=== POST /classify {log_id: 1} ===")
r = c.post("/classify", json={"log_id": 1})
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2))

print()
print("=== POST /classify {log_id: 41} (brute force syslog row) ===")
r = c.post("/classify", json={"log_id": 41})
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2))

print()
print("=== POST /classify {log_id: 999999} (non-existent) ===")
r = c.post("/classify", json={"log_id": 999999})
print(f"Status: {r.status_code}")
print(r.json())
