import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, JSON
from app.core.database import Base
from app.models.base import UTCDateTime


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., AUTH_LOGIN, PROJECT_CREATE, SCAN_START
    resource_type = Column(String(50), nullable=True)  # e.g., PROJECT, SCAN, POLICY
    resource_id = Column(String(36), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(UTCDateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
