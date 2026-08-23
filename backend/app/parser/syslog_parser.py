"""
parser/syslog_parser.py

Parses two syslog variants:

  1. RFC 3164 (with priority byte) — common from network devices / remote syslog:
       <PRIORITY>MON DD HH:MM:SS HOSTNAME TAG: MESSAGE

  2. PRI-less syslog — the format written by rsyslog/journald to local files
     on Debian/Ubuntu (/var/log/auth.log) and RHEL (/var/log/secure):
       MON DD HH:MM:SS HOSTNAME TAG: MESSAGE

Both variants carry: timestamp, hostname, tag (event_type), message.
The PRI-less variant has no priority byte, so severity is inferred from
message keywords instead.

RFC 3164 reference: https://datatracker.ietf.org/doc/html/rfc3164
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Optional

from app.parser.base import BaseParser, ParsedLogEntry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# RFC 3164 severity levels (lower 3 bits of priority)
# ---------------------------------------------------------------------------
_SEVERITY_MAP: dict[int, str] = {
    0: "emergency",
    1: "alert",
    2: "critical",
    3: "error",
    4: "warning",
    5: "notice",
    6: "info",
    7: "debug",
}

# Months as they appear in syslog timestamps
_MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
    "May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
    "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

# ---------------------------------------------------------------------------
# Main syslog line regex
# Groups:
#   priority  — integer inside <>
#   mon       — 3-letter month abbreviation
#   day       — day of month (1 or 2 digits, may be space-padded)
#   time      — HH:MM:SS
#   hostname  — hostname token
#   tag       — process name with optional [PID]
#   message   — everything after "tag: "
# ---------------------------------------------------------------------------
_SYSLOG_RE = re.compile(
    r"^<(?P<priority>\d+)>"
    r"(?P<mon>[A-Z][a-z]{2})\s+"
    r"(?P<day>\d{1,2})\s+"
    r"(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<hostname>\S+)\s+"
    r"(?P<tag>\S+?):\s+"
    r"(?P<message>.*)$"
)

# PRI-less syslog — the format written to local files by rsyslog/journald.
# Seen in /var/log/auth.log (Debian/Ubuntu) and /var/log/secure (RHEL).
# Identical structure but without the leading <PRIORITY> byte.
_SYSLOG_RE_NOPRI = re.compile(
    r"^(?P<mon>[A-Z][a-z]{2})\s+"
    r"(?P<day>\d{1,2})\s+"
    r"(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<hostname>\S+)\s+"
    r"(?P<tag>\S+?):\s+"
    r"(?P<message>.*)$"
)

# Keyword-based severity inference used when there is no priority byte.
_SEVERITY_KEYWORDS: list[tuple[str, str]] = [
    ("emergency",   "emergency"),
    ("critical",    "critical"),
    ("alert",       "alert"),
    ("failed",      "error"),
    ("failure",     "error"),
    ("error",       "error"),
    ("denied",      "warning"),
    ("invalid",     "warning"),
    ("warn",        "warning"),
    ("accepted",    "info"),
    ("opened",      "info"),
    ("started",     "info"),
    ("session",     "info"),
]


def _infer_severity(message: str) -> Optional[str]:
    """Infer severity from message keywords when no priority byte is present."""
    lower = message.lower()
    for keyword, severity in _SEVERITY_KEYWORDS:
        if keyword in lower:
            return severity
    return "info"  # safe default for unparsed messages

# Pattern to extract an IPv4 address from the message body.
# Used to populate source_ip when the message says "from X.X.X.X" or
# contains an address in @'X.X.X.X' syntax (MySQL-style).
_IP_FROM_RE = re.compile(
    r"(?:from\s+|@')(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"
)


def _parse_priority(raw: str) -> Optional[str]:
    """Decode the RFC 3164 priority byte into a severity string."""
    try:
        pri = int(raw)
        severity_level = pri & 0b111  # lower 3 bits
        return _SEVERITY_MAP.get(severity_level)
    except ValueError:
        return None


def _parse_timestamp(mon: str, day: str, time_str: str) -> Optional[datetime]:
    """
    Build a datetime from syslog components.  RFC 3164 has no year, so we
    use the current year.  Returns None if any component is unparseable.
    """
    try:
        month = _MONTHS.get(mon)
        if month is None:
            return None
        h, m, s = (int(x) for x in time_str.split(":"))
        current_year = datetime.now().year
        return datetime(
            year=current_year,
            month=month,
            day=int(day),
            hour=h,
            minute=m,
            second=s,
            # No timezone info in RFC 3164 — left naive (wall-clock local time)
        )
    except (ValueError, AttributeError):
        return None


def _extract_ip(message: str) -> Optional[str]:
    """
    Search the message body for an IPv4 address preceded by 'from ' or @'.
    Returns the first match, or None if no IP is found.
    Does NOT guess — if no match, source_ip stays None.
    """
    m = _IP_FROM_RE.search(message)
    return m.group(1) if m else None


_USERNAME_FOR_RE = re.compile(r"for\s+(\S+)\s+from")
_USERNAME_SUDO_RE = re.compile(r"^(\S+)\s*:\s*USER=")

def _extract_username(message: str) -> Optional[str]:
    """
    Search the message body for a username matching specific patterns.
    - "for <username> from"
    - "<username> : USER="
    """
    m = _USERNAME_FOR_RE.search(message)
    if m:
        return m.group(1)
        
    m = _USERNAME_SUDO_RE.search(message)
    if m:
        return m.group(1)
        
    return None


class SyslogParser(BaseParser):
    """
    Parses RFC 3164 BSD syslog lines.

    Contract (from BaseParser):
    - Returns one ParsedLogEntry per non-empty line.
    - Lines that don't match the expected pattern: raw_log set, all other
      fields None, WARNING logged, parsing continues without crashing.
    - source_ip is only set if an IP address is found in the message body
      via a pattern match — never fabricated.
    - timestamp uses current year (RFC 3164 omits the year).
    """

    def parse(self, file_content: str) -> list[ParsedLogEntry]:
        entries: list[ParsedLogEntry] = []

        for lineno, raw_line in enumerate(file_content.splitlines(), start=1):
            line = raw_line.rstrip("\r\n")
            if not line.strip():
                continue  # skip blank lines silently

            # Try strict RFC 3164 first (has <PRIORITY> byte)
            m = _SYSLOG_RE.match(line)
            if m is not None:
                message_body = m.group("message")
                entries.append(ParsedLogEntry(
                    raw_log=line,
                    source_format="syslog",
                    timestamp=_parse_timestamp(
                        m.group("mon"), m.group("day"), m.group("time")
                    ),
                    hostname=m.group("hostname"),
                    event_type=m.group("tag"),
                    severity=_parse_priority(m.group("priority")),
                    source_ip=_extract_ip(message_body),
                    message=message_body,
                    destination_ip=None,
                    username=_extract_username(message_body),
                ))
                continue

            # Fall back to PRI-less syslog (/var/log/auth.log style)
            m2 = _SYSLOG_RE_NOPRI.match(line)
            if m2 is not None:
                message_body = m2.group("message")
                entries.append(ParsedLogEntry(
                    raw_log=line,
                    source_format="syslog",
                    timestamp=_parse_timestamp(
                        m2.group("mon"), m2.group("day"), m2.group("time")
                    ),
                    hostname=m2.group("hostname"),
                    event_type=m2.group("tag"),
                    severity=_infer_severity(message_body),
                    source_ip=_extract_ip(message_body),
                    message=message_body,
                    destination_ip=None,
                    username=_extract_username(message_body),
                ))
                continue

            # Neither pattern matched
            logger.warning(
                "SyslogParser: line %d did not match any syslog format — stored raw only",
                lineno,
            )
            entries.append(ParsedLogEntry(raw_log=line, source_format="syslog"))

        return entries
