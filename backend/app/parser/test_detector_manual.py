"""
test_detector_manual.py

Manual eyeball test for the auto-detecting parser.

Run from inside backend/ with the venv active:

    python app/parser/test_detector_manual.py
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Make `app` importable when running directly from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # …/backend

logging.basicConfig(level=logging.WARNING, format="%(levelname)s -- %(message)s")

from app.parser.detector import detect_and_parse, UnknownLogFormatError  # noqa: E402

SAMPLE_LOGS_DIR = (
    Path(__file__).resolve().parents[3]  # monorepo root
    / "sample_logs"
)

def main() -> None:
    if not SAMPLE_LOGS_DIR.exists():
        print(f"ERROR: sample_logs directory not found at {SAMPLE_LOGS_DIR}", file=sys.stderr)
        sys.exit(1)

    files_to_test = [
        "apache_sample.log",
        "json_sample.log",
        "syslog_sample.log"
    ]

    for filename in files_to_test:
        file_path = SAMPLE_LOGS_DIR / filename
        if not file_path.exists():
            print(f"WARNING: File {filename} not found, skipping.")
            continue
            
        print(f"--- Testing {filename} ---")
        content = file_path.read_text(encoding="utf-8", errors="replace")
        try:
            entries = detect_and_parse(content, filename=filename)
            print(f"Success! Detected format and parsed {len(entries)} entries.")
        except UnknownLogFormatError as e:
            print(f"Failed to detect format: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")
        print()

if __name__ == "__main__":
    main()
