import enum
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Text, Float, Boolean, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseDBModel

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.source import Source


class AnalysisStatus(str, enum.Enum):
    PENDING = "PENDING"
    ANALYZING = "ANALYZING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ProjectAnalysis(BaseDBModel):
    __tablename__ = "project_analyses"

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True
    )
    source_fingerprint: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    primary_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    detected_languages: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    language_statistics: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    framework: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    framework_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    build_system: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    dependency_manifests: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    entry_points: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    application_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    binary_capable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    binary_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    statistics: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    warnings: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    status: Mapped[AnalysisStatus] = mapped_column(
        String(50), default=AnalysisStatus.COMPLETED.value, nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="analyses")
    source: Mapped[Optional["Source"]] = relationship("Source")
