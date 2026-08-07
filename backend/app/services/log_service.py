from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.parser.log_parser import LogParser
from app.detection.engine import DetectionEngine
from app.repositories.log_repository import LogRepository
from app.schemas.log_schema import LogCreate

class LogService:
    def __init__(self, db: Session):
        self.db = db
        self.parser = LogParser()
        self.engine = DetectionEngine()
        self.repo = LogRepository(db)

    def analyze_content(self, content: str) -> Dict[str, Any]:
        parsed_logs = self.parser.parse_content(content)
        detections = self.engine.detect(parsed_logs)
        
        saved_logs = []
        for log_data in parsed_logs:
            log_in = LogCreate(
                timestamp=log_data.get("timestamp"),
                source_ip=log_data.get("source_ip"),
                raw_log=log_data.get("raw_log"),
                parsed_data=log_data.get("parsed_data")
            )
            saved = self.repo.create_log(log_in)
            if saved:
                saved_logs.append(saved)
            
        return {
            "status": "success",
            "total_logs_analyzed": len(parsed_logs),
            "threats_detected": len(detections),
            "critical_count": 0,
            "threat_summary": [],
            "all_logs": parsed_logs[:500] 
        }
