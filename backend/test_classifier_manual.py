"""Smoke test for the LoRA classifier service."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.ml.classifier_service import classify, build_input_text, classify_log_row
from app.database import SessionLocal
from app.repositories.log_repository import get_log_by_id

# Test 1: brute force-style log
text1 = build_input_text(
    source_ip="192.168.1.50",
    event_type="sshd[1234]",
    severity="critical",
    message="Failed password for admin from 192.168.1.50 port 22 ssh2"
)
r1 = classify(text1)
print("=== Brute Force log ===")
print(f"  Input : {text1[:90]}")
print(f"  Label : {r1['label']}  Confidence: {r1['confidence']}")
print(f"  Scores: {r1['all_scores']}")

# Test 2: normal-looking log
text2 = build_input_text(
    source_ip="10.0.0.1",
    event_type="sshd",
    severity="info",
    message="Accepted password for alice from 10.0.0.1 port 443 ssh2"
)
r2 = classify(text2)
print()
print("=== Normal log ===")
print(f"  Input : {text2[:90]}")
print(f"  Label : {r2['label']}  Confidence: {r2['confidence']}")
print(f"  Scores: {r2['all_scores']}")

# Test 3: real DB row via classify_log_row
print()
print("=== Real DB row (log_id=1) ===")
db = SessionLocal()
try:
    log_row = get_log_by_id(db, 1)
    if log_row:
        result = classify_log_row(log_row)
        print(f"  raw_log : {log_row.raw_log[:80]}")
        print(f"  Label   : {result['label']}  Confidence: {result['confidence']}")
        print(f"  Scores  : {result['all_scores']}")
    else:
        print("  No row with id=1 found in DB.")
finally:
    db.close()
