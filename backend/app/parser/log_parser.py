import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

class LogParser:
    def __init__(self):
        # Basic apache regex
        self.apache_pattern = re.compile(
            r'(?P<ip>\S+) \S+ \S+ \[(?P<time>.*?)\] "(?P<request>.*?)" (?P<status>\d{3}) (?P<size>\S+)'
        )
        # Basic syslog regex
        self.syslog_pattern = re.compile(
            r'(?P<time>[A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+)\s+(?P<host>\S+)\s+(?P<process>.*?):\s+(?P<message>.*)'
        )

    def parse_line(self, line: str) -> Optional[Dict[str, Any]]:
        line = line.strip()
        if not line:
            return None

        # 1. Try JSON
        try:
            data = json.loads(line)
            return self._normalize_json(data, line)
        except json.JSONDecodeError:
            pass

        # 2. Try Apache
        apache_match = self.apache_pattern.match(line)
        if apache_match:
            return self._normalize_apache(apache_match.groupdict(), line)

        # 3. Try Syslog
        syslog_match = self.syslog_pattern.match(line)
        if syslog_match:
            return self._normalize_syslog(syslog_match.groupdict(), line)

        # Unsupported format - gracefully reject by returning None
        return None

    def _normalize_json(self, data: dict, raw: str) -> Dict[str, Any]:
        return {
            "timestamp": data.get("timestamp") or data.get("time") or datetime.utcnow().isoformat(),
            "source_ip": data.get("source_ip") or data.get("ip"),
            "raw_log": raw,
            "parsed_data": data,
        }

    def _normalize_apache(self, data: dict, raw: str) -> Dict[str, Any]:
        return {
            "timestamp": data.get("time"),
            "source_ip": data.get("ip"),
            "raw_log": raw,
            "parsed_data": {"request": data.get("request"), "status": data.get("status"), "size": data.get("size")},
        }

    def _normalize_syslog(self, data: dict, raw: str) -> Dict[str, Any]:
        return {
            "timestamp": data.get("time"),
            "source_ip": None,
            "raw_log": raw,
            "parsed_data": {"host": data.get("host"), "process": data.get("process"), "message": data.get("message")},
        }

    def parse_content(self, content: str) -> List[Dict[str, Any]]:
        lines = content.splitlines()
        results = []
        for line in lines:
            parsed = self.parse_line(line)
            if parsed:
                results.append(parsed)
        return results
