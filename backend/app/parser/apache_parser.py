"""
parser/apache_parser.py

Parses the Apache Common Log Format and Combined Log Format lines:

  Common:
    host ident authuser [date] "request" status bytes

  Combined (Common + referrer + user-agent — extras are ignored if absent):
    host ident authuser [date] "request" status bytes "referrer" "user-agent"

Reference: https://httpd.apache.org/docs/current/logs.html#accesslog
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.parser.base import BaseParser, ParsedLogEntry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regex for Apache Common / Combined log format
# Groups (all named):
#   host       — client IP or hostname
#   ident      — RFC 1413 identity (almost always "-")
#   authuser   — authenticated username ("-" if unauthenticated)
#   day, mon, year, hour, min, sec — date/time components
#   tz_sign, tz_h, tz_m            — UTC offset
#   method     — HTTP verb
#   path       — request path (may include query string)
#   protocol   — HTTP/x.x
#   status     — 3-digit HTTP status code
#   size       — response size in bytes ("-" if none)
# ---------------------------------------------------------------------------
_APACHE_RE = re.compile(
    r'(?P<host>\S+)'                            # client host/IP
    r'\s+\S+'                                   # ident (ignored)
    r'\s+(?P<authuser>\S+)'                     # authenticated user
    r'\s+\[(?P<day>\d{2})/(?P<mon>[A-Za-z]{3})/(?P<year>\d{4})'
    r':(?P<hour>\d{2}):(?P<min>\d{2}):(?P<sec>\d{2})'
    r'\s+(?P<tz_sign>[+-])(?P<tz_h>\d{2})(?P<tz_m>\d{2})\]'  # [date time +offset]
    r'\s+"(?P<method>[A-Z]+)\s+(?P<path>\S+)\s+(?P<protocol>HTTP/\S+)"'  # "METHOD path proto"
    r'\s+(?P<status>\d{3})'                     # status code
    r'\s+(?P<size>\S+)'                         # bytes or "-"
    r'(?:\s+"[^"]*"\s+"[^"]*")?'               # optional referrer + UA (Combined)
    r'\s*$'
)

# Apache date months
_MONTH_MAP = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5,  'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
}


def _parse_timestamp(m: re.Match) -> Optional[datetime]:
    """Convert the date/time components captured by the regex into a timezone-aware datetime."""
    try:
        sign = 1 if m.group('tz_sign') == '+' else -1
        offset = timedelta(
            hours=sign * int(m.group('tz_h')),
            minutes=sign * int(m.group('tz_m')),
        )
        tz = timezone(offset)
        return datetime(
            year=int(m.group('year')),
            month=_MONTH_MAP[m.group('mon')],
            day=int(m.group('day')),
            hour=int(m.group('hour')),
            minute=int(m.group('min')),
            second=int(m.group('sec')),
            tzinfo=tz,
        )
    except (KeyError, ValueError):
        return None


def _status_to_severity(status: str) -> str:
    """Map an HTTP status code string to a severity label."""
    code = int(status)
    if code < 400:
        return "info"       # 2xx success, 3xx redirect
    elif code < 500:
        return "warning"    # 4xx client error
    else:
        return "error"      # 5xx server error


class ApacheParser(BaseParser):
    """
    Parses Apache Common / Combined Log Format.

    Contract (from BaseParser):
    - Returns one ParsedLogEntry per non-empty line.
    - Lines that don't match the pattern: raw_log is set, all other fields
      are None. A warning is logged; the whole file does not crash.
    - No field is ever fabricated or guessed.
    """

    def parse(self, file_content: str) -> list[ParsedLogEntry]:
        entries: list[ParsedLogEntry] = []

        for lineno, raw_line in enumerate(file_content.splitlines(), start=1):
            line = raw_line.rstrip('\r\n')
            if not line.strip():
                continue  # skip blank lines silently

            m = _APACHE_RE.match(line)
            if m is None:
                logger.warning("ApacheParser: line %d did not match expected format — stored raw only", lineno)
                entries.append(ParsedLogEntry(raw_log=line, source_format="apache"))
                continue

            authuser = m.group('authuser')
            username = authuser if authuser != '-' else None

            method = m.group('method')
            path = m.group('path')
            status = m.group('status')
            protocol = m.group('protocol')

            entries.append(ParsedLogEntry(
                raw_log=line,
                source_format="apache",
                timestamp=_parse_timestamp(m),
                source_ip=m.group('host'),
                destination_ip=None,        # not present in Apache access logs
                hostname=None,              # not present in Apache access logs
                username=username,
                event_type=method,          # "GET", "POST", etc.
                severity=_status_to_severity(status),
                message=f'{method} {path} {protocol} -> {status}',
            ))

        return entries
