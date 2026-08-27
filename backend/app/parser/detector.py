"""
parser/detector.py

Auto-detects log format from file content and routes to the correct parser.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from app.parser.base import ParsedLogEntry
from app.parser.apache_parser import ApacheParser, _APACHE_RE
from app.parser.json_parser import JsonParser
from app.parser.syslog_parser import SyslogParser, _SYSLOG_RE, _SYSLOG_RE_NOPRI

logger = logging.getLogger(__name__)


class UnknownLogFormatError(Exception):
    """Raised when the log format cannot be confidently determined."""
    pass


def detect_and_parse(file_content: str, filename: Optional[str] = None) -> list[ParsedLogEntry]:
    """
    Detect the format of the log file and parse it.
    
    Reads up to the first 10 non-empty lines to determine the format.
    Raises UnknownLogFormatError if no known format matches.
    """
    lines = [line.strip() for line in file_content.splitlines() if line.strip()]
    if not lines:
        return []

    sample_lines = lines[:10]

    syslog_score = 0
    json_score = 0
    apache_score = 0

    for line in sample_lines:
        if line.startswith("{") and line.endswith("}"):
            try:
                obj = json.loads(line)
                if isinstance(obj, dict):
                    json_score += 1
            except Exception:
                pass
        elif _SYSLOG_RE.match(line) or (line.startswith("<") and ">" in line[:6]):
            syslog_score += 1
        elif _SYSLOG_RE_NOPRI.match(line):
            # PRI-less syslog (/var/log/auth.log, /var/log/secure) —
            # same format as RFC 3164 but without the leading <PRIORITY> byte.
            syslog_score += 1
        elif _APACHE_RE.match(line):
            apache_score += 1

    scores = {
        "syslog": syslog_score,
        "json": json_score,
        "apache": apache_score,
    }

    best_format = max(scores, key=scores.get)
    best_score = scores[best_format]

    if best_score == 0:
        raise UnknownLogFormatError(
            f"Could not determine log format for file '{filename or 'unknown'}'. "
            "No sample lines matched JSON, Syslog, or Apache formats."
        )

    logger.info(
        "Detected format '%s' for file '%s' (score: %d/%d)",
        best_format, filename or "unknown", best_score, len(sample_lines)
    )

    # Initialize all parsers
    parser_map = {
        "apache": ApacheParser(),
        "syslog": SyslogParser(),
        "json": JsonParser()
    }

    # Order parsers to try the best format first for performance
    ordered_formats = [best_format] + [fmt for fmt in parser_map if fmt != best_format]

    entries = []

    for line in lines:
        line_entry = None
        for fmt in ordered_formats:
            # parser.parse splits string into lines internally, so passing a single line is safe
            result = parser_map[fmt].parse(line)
            if not result:
                continue
            entry = result[0]

            # A parsed entry is considered "successful" if at least one extracted field is present
            is_parsed = not (
                entry.timestamp is None and entry.source_ip is None and
                entry.destination_ip is None and entry.hostname is None and
                entry.username is None and entry.event_type is None and
                entry.severity is None and entry.message is None
            )

            if is_parsed:
                line_entry = entry
                break
            else:
                # If it failed, keep the failure result from the best_format as a fallback,
                # but continue trying other parsers.
                if line_entry is None or fmt == best_format:
                    line_entry = entry

        if line_entry:
            entries.append(line_entry)

    return entries
