import enum
from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Integer, Text, Enum, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseDBModel, UTCDateTime

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.source import Source
    from app.models.analysis import ProjectAnalysis


class ScanStatus(str, enum.Enum):
    CREATED = "CREATED"
    QUEUED = "QUEUED"
    PREPARING = "PREPARING"
    RUNNING = "RUNNING"
    AGGREGATING = "AGGREGATING"
    COMPLETED = "COMPLETED"
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"


class ModuleStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"
    SKIPPED = "SKIPPED"


class ModuleType(str, enum.Enum):
    SAST = "SAST"
    SCA = "SCA"
    DAST = "DAST"
    BINARY_ANALYSIS = "BINARY_ANALYSIS"
    GNN = "GNN"


class FindingSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class FindingConfidence(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class Scan(BaseDBModel):
    __tablename__ = "scans"

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True
    )
    analysis_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("project_analyses.id", ondelete="SET NULL"), nullable=True
    )
    source_fingerprint: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    status: Mapped[ScanStatus] = mapped_column(
        String(50), default=ScanStatus.CREATED.value, nullable=False
    )
    findings_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    severity_summary: Mapped[Optional[Dict[str, int]]] = mapped_column(
        JSON, default=lambda: {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}, nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="scans")
    source: Mapped[Optional["Source"]] = relationship("Source")
    analysis: Mapped[Optional["ProjectAnalysis"]] = relationship("ProjectAnalysis")
    modules: Mapped[List["ScanModule"]] = relationship(
        "ScanModule", back_populates="scan", cascade="all, delete-orphan"
    )
    results: Mapped[List["ScanResult"]] = relationship(
        "ScanResult", back_populates="scan", cascade="all, delete-orphan"
    )


class ScanModule(BaseDBModel):
    __tablename__ = "scan_modules"

    scan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    module_type: Mapped[ModuleType] = mapped_column(String(50), nullable=False)
    status: Mapped[ModuleStatus] = mapped_column(
        String(50), default=ModuleStatus.PENDING.value, nullable=False
    )
    findings_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skip_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_time_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    started_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(timezone=True), nullable=True)

    # Relationships
    scan: Mapped["Scan"] = relationship("Scan", back_populates="modules")
    results: Mapped[List["ScanResult"]] = relationship(
        "ScanResult", back_populates="scan_module", cascade="all, delete-orphan"
    )


class FindingLifecycleStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class ScanResult(BaseDBModel):
    __tablename__ = "scan_results"

    scan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scan_module_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("scan_modules.id", ondelete="CASCADE"), nullable=True
    )
    module_type: Mapped[ModuleType] = mapped_column(String(50), nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[FindingSeverity] = mapped_column(String(50), nullable=False)
    confidence: Mapped[FindingConfidence] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)

    file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    column: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    scanner: Mapped[str] = mapped_column(String(100), nullable=False)
    rule_id: Mapped[str] = mapped_column(String(100), nullable=False)
    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    status: Mapped[FindingLifecycleStatus] = mapped_column(
        String(50), default=FindingLifecycleStatus.OPEN.value, nullable=False, index=True
    )
    fingerprint: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    first_seen_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(timezone=True), nullable=True)

    # Relationships
    scan: Mapped["Scan"] = relationship("Scan", back_populates="results")
    scan_module: Mapped[Optional["ScanModule"]] = relationship("ScanModule", back_populates="results")

