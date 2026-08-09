"""
test_json_manual.py

Manual eyeball test for JsonParser.

Run from inside backend/ with the venv active:

    python app/parser/test_json_manual.py

Reads sample_logs/json_sample.log (at the monorepo root), parses every
line, and prints a human-readable summary of each ParsedLogEntry.
WARNING-level messages from the parser are printed to the console so you
can see which lines were rejected and why.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Make `app` importable when running directly from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # …/backend

logging.basicConfig(level=logging.WARNING, format="%(levelname)s -- %(message)s")

from app.parser.json_parser import JsonParser  # noqa: E402

SAMPLE_LOG = (
    Path(__file__).resolve().parents[3]  # monorepo root: backend/app/parser -> 3 up
    / "sample_logs"
    / "json_sample.log"
)


def main() -> None:
    if not SAMPLE_LOG.exists():
        print(f"ERROR: sample log not found at {SAMPLE_LOG}", file=sys.stderr)
        sys.exit(1)

    content = SAMPLE_LOG.read_text(encoding="utf-8", errors="replace")
    parser = JsonParser()
    entries = parser.parse(content)

    print(f"Parsed {len(entries)} entries from {SAMPLE_LOG.name}\n")
    print("=" * 70)

    for i, e in enumerate(entries, start=1):
        print(f"\n[{i}]")
        print(f"  raw_log       : {e.raw_log[:80]}{'...' if len(e.raw_log) > 80 else ''}")
        print(f"  source_format : {e.source_format}")
        print(f"  timestamp     : {e.timestamp}")
        print(f"  source_ip     : {e.source_ip}")
        print(f"  destination_ip: {e.destination_ip}")
        print(f"  hostname      : {e.hostname}")
        print(f"  username      : {e.username}")
        print(f"  event_type    : {e.event_type}")
        print(f"  severity      : {e.severity}")
        print(f"  message       : {e.message}")


if __name__ == "__main__":
    main()
