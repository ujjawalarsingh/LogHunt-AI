"""
test_upload_manual.py

Manual test for the upload endpoint using FastAPI TestClient.

Run from inside backend/ with the venv active:

    python test_upload_manual.py
"""
import sys
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_LOGS_DIR = (
    Path(__file__).resolve().parents[1]  # monorepo root (backend/ -> 1 up)
    / "sample_logs"
)

def test_upload(filename: str):
    file_path = SAMPLE_LOGS_DIR / filename
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return
        
    print(f"--- Uploading {filename} ---")
    with open(file_path, "rb") as f:
        response = client.post(
            "/upload",
            files={"file": (filename, f, "text/plain")}
        )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def main():
    if not SAMPLE_LOGS_DIR.exists():
        print(f"ERROR: sample_logs directory not found at {SAMPLE_LOGS_DIR}")
        sys.exit(1)

    for f in ["apache_sample.log", "json_sample.log", "syslog_sample.log"]:
        test_upload(f)

if __name__ == "__main__":
    main()
