from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)

    # Parsed fields — all nullable: if the parser can't extract a field, store NULL
    timestamp = Column(DateTime(timezone=True), nullable=True, index=True)
    source_ip = Column(String, nullable=True, index=True)
    destination_ip = Column(String, nullable=True)
    hostname = Column(String, nullable=True)
    username = Column(String, nullable=True)
    event_type = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    message = Column(Text, nullable=True)

    # Always stored — the original raw line, never modified
    raw_log = Column(Text, nullable=False)

    # Which parser produced this row ("apache", "json", "syslog")
    source_format = Column(String, nullable=True)

    # Optional grouping by project
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)

    # Row-insertion timestamp (set by the DB server, not the application)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="logs")
    alerts = relationship("Alert", back_populates="log")
