from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    # Which log line triggered this alert
    log_id = Column(Integer, ForeignKey("logs.id"), nullable=False, index=True)

    # e.g. "brute_force", "credential_stuffing", "privilege_escalation",
    # or a LoRA-classifier threat category
    alert_type = Column(String, nullable=False, index=True)

    # Which detection method produced this alert
    source = Column(String, nullable=False)  # "rule_engine" | "lora_classifier"

    severity = Column(String, nullable=False)

    # Only populated for LoRA-classifier alerts; NULL for rule-based alerts
    confidence_score = Column(Float, nullable=True)

    # Human-readable explanation of why this alert was triggered
    description = Column(Text, nullable=False)

    # Row-insertion timestamp (set by the DB server)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship back to the triggering log line
    log = relationship("Log", back_populates="alerts")
