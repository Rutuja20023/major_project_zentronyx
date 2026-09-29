import uuid
from enum import Enum as PyEnum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, JSON, Integer, Float, Boolean, Enum
from app.core.database import Base
from app.models.base import UTCDateTime



class PolicyDecision(str, PyEnum):
    PASS = "PASS"
    WARN = "WARN"
    BLOCK = "BLOCK"


class FindingLifecycleStatus(str, PyEnum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class SecurityPolicy(Base):
    __tablename__ = "security_policies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)

    max_critical_findings = Column(Integer, default=0)
    max_high_findings = Column(Integer, default=3)
    max_malware_probability = Column(Float, default=0.70)
    block_on_dast_critical = Column(Boolean, default=True)
    block_on_critical_sca = Column(Boolean, default=True)

    created_at = Column(UTCDateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(UTCDateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PolicyEvaluation(Base):
    __tablename__ = "policy_evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), nullable=False, index=True)
    project_id = Column(String(36), nullable=False, index=True)
    policy_id = Column(String(36), nullable=True)

    decision = Column(Enum(PolicyDecision), nullable=False)
    reasons = Column(JSON, nullable=True)
    rule_violations = Column(JSON, nullable=True)

    created_at = Column(UTCDateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
