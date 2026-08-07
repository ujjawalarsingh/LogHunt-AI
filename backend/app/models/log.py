from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.sql import func
from app.database.session import Base

class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=func.now())
    source_ip = Column(String, index=True, nullable=True)
    raw_log = Column(Text, nullable=False)
    parsed_data = Column(JSON, nullable=True)
    threat_type = Column(String, index=True, nullable=True)
    severity = Column(String, index=True, nullable=True)
