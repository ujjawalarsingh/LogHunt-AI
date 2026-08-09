"""
test_apache_manual.py

Manual eyeball test for ApacheParser.

Run from inside backend/ with the venv active:

    python app/parser/test_apache_manual.py

Reads sample_logs/apache_sample.log (relative to the monorepo root,
two levels up from this file), parses every line, and prints a
human-readable summary of each ParsedLogEntry.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Make sure `app` is importable when running the script directly from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # …/backend

# Show WARNING-level parser messages in the console while testing
logging.basicConfig(level=logging.WARNING, format="%(levelname)s — %(message)s")

from app.parser.apache_parser import ApacheParser  # noqa: E402

SAMPLE_LOG = (
    Path(__file__).resolve().parents[3]  # monorepo root  (backend/app/parser/… → 3 levels up)
    / "sample_logs"
    / "apache_sample.log"
)


def main() -> None:
    if not SAMPLE_LOG.exists():
        print(f"ERROR: sample log not found at {SAMPLE_LOG}", file=sys.stderr)
        sys.exit(1)

    content = SAMPLE_LOG.read_text(encoding="utf-8", errors="replace")
    parser = ApacheParser()
    entries = parser.parse(content)

    print(f"Parsed {len(entries)} entries from {SAMPLE_LOG.name}\n")
    print("=" * 70)

    for i, e in enumerate(entries, start=1):
        print(f"\n[{i}]")
        print(f"  raw_log       : {e.raw_log}")
        print(f"  source_format : {e.source_format}")
        print(f"  timestamp     : {e.timestamp}")
        print(f"  source_ip     : {e.source_ip}")
        print(f"  username      : {e.username}")
        print(f"  event_type    : {e.event_type}")
        print(f"  severity      : {e.severity}")
        print(f"  message       : {e.message}")
        print(f"  destination_ip: {e.destination_ip}")
        print(f"  hostname      : {e.hostname}")


if __name__ == "__main__":
    main()
