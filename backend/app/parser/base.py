"""
parser/base.py

Defines the shared ParsedLogEntry dataclass and the abstract BaseParser
interface that all concrete parsers implement.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ParsedLogEntry:
    """
    Normalized log entry matching the Log model schema.

    All fields except raw_log are Optional — if the parser cannot extract
    a field from the raw line it must leave it as None rather than guessing
    or fabricating a value.
    """
    raw_log: str                            # always populated, never None

    timestamp: Optional[datetime] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    hostname: Optional[str] = None
    username: Optional[str] = None
    event_type: Optional[str] = None       # e.g. "GET", "POST", "sudo", …
    severity: Optional[str] = None         # "info" | "warning" | "error"
    message: Optional[str] = None          # human-readable summary of the line
    source_format: Optional[str] = None    # "apache" | "json" | "syslog"


class BaseParser(abc.ABC):
    """
    Abstract parser interface.  Every concrete parser must implement `parse`.
    """

    @abc.abstractmethod
    def parse(self, file_content: str) -> list[ParsedLogEntry]:
        """
        Parse the full text content of a log file.

        Args:
            file_content: Raw string contents of the uploaded file.

        Returns:
            A list of ParsedLogEntry objects — one per non-empty line.
            Lines that fail to match the expected format are returned with
            only raw_log populated; no other field is fabricated.
        """
