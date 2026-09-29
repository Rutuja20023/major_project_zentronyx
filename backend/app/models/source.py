import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseDBModel, UTCDateTime

if TYPE_CHECKING:
    from app.models.project import Project


class SourceType(str, enum.Enum):
    ZIP = "ZIP"
    GITHUB = "GITHUB"


class AcquisitionStatus(str, enum.Enum):
    PENDING = "PENDING"
    VALIDATING = "VALIDATING"
    ACQUIRING = "ACQUIRING"
    EXTRACTING = "EXTRACTING"
    READY = "READY"
    FAILED = "FAILED"


class Source(BaseDBModel):
    __tablename__ = "sources"

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="sourcetype", native_enum=False),
        nullable=False
    )
    source_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    storage_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    commit_hash: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_fingerprint: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    acquisition_status: Mapped[AcquisitionStatus] = mapped_column(
        Enum(AcquisitionStatus, name="acquisitionstatus", native_enum=False),
        default=AcquisitionStatus.PENDING,
        nullable=False
    )
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    acquired_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="sources")
