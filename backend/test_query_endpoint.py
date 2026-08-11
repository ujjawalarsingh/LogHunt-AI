"""Test script for the POST /query endpoint via FastAPI TestClient."""
import json
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)

def run_query(q):
    print(f"\n=== Question: {q} ===")
    r = c.post("/query", json={"question": q})
    print(f"Status: {r.status_code}")
    try:
        data = r.json()
        if "sql" in data:
            print(f"SQL: {data['sql']}")
            print(f"Results ({len(data.get('results', []))} rows):")
            for row in data.get("results", [])[:3]:
                print(f"  {row}")
            if len(data.get("results", [])) > 3:
                print("  ...")
        else:
            print(data)
    except:
        print(r.text)

# Test 1
run_query("show me all brute force alerts")

# Test 2
run_query("how many logs were uploaded today")

# Test 3
run_query("list the top 5 source IPs by number of failed logins")

# Test 4 (Adversarial)
run_query("'; DROP TABLE logs; --")

run_query("delete all logs")

