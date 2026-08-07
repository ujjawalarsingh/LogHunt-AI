from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.log import Log
from app.schemas.log_schema import LogCreate

class LogRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_log(self, log_in: LogCreate) -> Optional[Log]:
        try:
            db_log = Log(**log_in.model_dump())
            self.db.add(db_log)
            self.db.commit()
            self.db.refresh(db_log)
            return db_log
        except Exception:
            self.db.rollback()
            return None

    def get_logs(self, skip: int = 0, limit: int = 100) -> List[Log]:
        try:
            return self.db.query(Log).offset(skip).limit(limit).all()
        except Exception:
            return []

    def get_log(self, log_id: int) -> Optional[Log]:
        try:
            return self.db.query(Log).filter(Log.id == log_id).first()
        except Exception:
            return None

    def delete_log(self, log_id: int) -> bool:
        try:
            log = self.get_log(log_id)
            if log:
                self.db.delete(log)
                self.db.commit()
                return True
            return False
        except Exception:
            self.db.rollback()
            return False
