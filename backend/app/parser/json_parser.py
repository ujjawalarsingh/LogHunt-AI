"""
parser/json_parser.py

Parses line-delimited JSON logs — one JSON object per line (NDJSON/JSON Lines).

Key mapping from raw JSON keys to the normalized ParsedLogEntry schema:

    JSON key(s) checked (in order)     -> schema field
    -------------------------------------------------------
    "timestamp", "@timestamp"           -> timestamp
    "source_ip", "src_ip", "client_ip"  -> source_ip
    "destination_ip", "dest_ip"         -> destination_ip
    "hostname", "host"                  -> hostname
    "username", "user"                  -> username
    "event_type", "event", "action"     -> event_type
    "severity", "level", "log_level"    -> severity
    "message", "msg"                    -> message

Any JSON key not in the mapping above is ignored (not stored, not fabricated).
Any schema field whose key is absent from the JSON object stays None.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from app.parser.base import BaseParser, ParsedLogEntry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Key aliases: maps each schema field to the list of JSON keys we accept,
# checked left-to-right — the first one found wins.
# ---------------------------------------------------------------------------
_KEY_ALIASES: dict[str, list[str]] = {
    "timestamp":      ["timestamp", "@timestamp"],
    "source_ip":      ["source_ip", "src_ip", "client_ip"],
    "destination_ip": ["destination_ip", "dest_ip"],
    "hostname":       ["hostname", "host"],
    "username":       ["username", "user"],
    "event_type":     ["event_type", "event", "action"],
    "severity":       ["severity", "level", "log_level"],
    "message":        ["message", "msg"],
}

# Timestamp formats tried in order when parsing the timestamp string.
_TS_FORMATS = (
    "%Y-%m-%dT%H:%M:%SZ",        # 2024-01-15T10:22:31Z  (UTC explicit)
    "%Y-%m-%dT%H:%M:%S%z",       # 2024-01-15T10:22:31+05:30
    "%Y-%m-%dT%H:%M:%S.%f%z",    # with microseconds + offset
    "%Y-%m-%dT%H:%M:%S.%fZ",     # with microseconds, UTC
    "%Y-%m-%d %H:%M:%S",         # 2024-01-15 10:22:31 (no tz — left naive)
)


def _lookup(obj: dict, aliases: list[str]) -> Optional[str]:
    """Return the value of the first matching alias key, or None."""
    for key in aliases:
        if key in obj:
            val = obj[key]
            return str(val) if val is not None else None
    return None


def _parse_timestamp(raw: str) -> Optional[datetime]:
    """
    Try each known timestamp format.  Returns a datetime on success,
    None on failure — never raises, never fabricates.
    """
    raw = raw.strip()
    for fmt in _TS_FORMATS:
        try:
            dt = datetime.strptime(raw, fmt)
            # If the format produced a naive datetime, mark it UTC so
            # SQLAlchemy's timezone-aware column accepts it.
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


class JsonParser(BaseParser):
    """
    Parses line-delimited JSON logs (NDJSON / JSON Lines).

    Contract (from BaseParser):
    - Returns one ParsedLogEntry per non-empty line.
    - Lines that are not valid JSON: raw_log set, all other fields None,
      warning logged, parsing continues.
    - Lines that are valid JSON but missing schema fields: those fields
      stay None — nothing is fabricated or defaulted.
    - Timestamp strings that are present but unparseable: timestamp stays
      None rather than guessing.
    """

    def parse(self, file_content: str) -> list[ParsedLogEntry]:
        entries: list[ParsedLogEntry] = []

        for lineno, raw_line in enumerate(file_content.splitlines(), start=1):
            line = raw_line.rstrip("\r\n")
            if not line.strip():
                continue  # skip blank lines silently

            # --- Attempt JSON decode ---
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as exc:
                logger.warning(
                    "JsonParser: line %d is not valid JSON (%s) — stored raw only",
                    lineno, exc.msg,
                )
                entries.append(ParsedLogEntry(raw_log=line, source_format="json"))
                continue

            if not isinstance(obj, dict):
                logger.warning(
                    "JsonParser: line %d parsed as %s (expected object) — stored raw only",
                    lineno, type(obj).__name__,
                )
                entries.append(ParsedLogEntry(raw_log=line, source_format="json"))
                continue

            # --- Extract each schema field using the alias map ---
            ts_raw = _lookup(obj, _KEY_ALIASES["timestamp"])
            timestamp: Optional[datetime] = None
            if ts_raw is not None:
                timestamp = _parse_timestamp(ts_raw)
                if timestamp is None:
                    logger.warning(
                        "JsonParser: line %d has timestamp %r but it could not be parsed — left None",
                        lineno, ts_raw,
                    )

            entries.append(ParsedLogEntry(
                raw_log=line,
                source_format="json",
                timestamp=timestamp,
                source_ip=      _lookup(obj, _KEY_ALIASES["source_ip"]),
                destination_ip= _lookup(obj, _KEY_ALIASES["destination_ip"]),
                hostname=       _lookup(obj, _KEY_ALIASES["hostname"]),
                username=       _lookup(obj, _KEY_ALIASES["username"]),
                event_type=     _lookup(obj, _KEY_ALIASES["event_type"]),
                severity=       _lookup(obj, _KEY_ALIASES["severity"]),
                message=        _lookup(obj, _KEY_ALIASES["message"]),
            ))

        return entries
