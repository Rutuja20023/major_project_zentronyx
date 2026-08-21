import enum
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Float, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseDBModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.scan import Scan
    from app.models.source import Source
    from app.models.analysis import ProjectAnalysis


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class Project(BaseDBModel):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    repository_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, name="risklevel", native_enum=False),
        default=RiskLevel.UNKNOWN,
        nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="projects")
    scans: Mapped[List["Scan"]] = relationship("Scan", back_populates="project", cascade="all, delete-orphan")
    sources: Mapped[List["Source"]] = relationship("Source", back_populates="project", cascade="all, delete-orphan")
    analyses: Mapped[List["ProjectAnalysis"]] = relationship("ProjectAnalysis", back_populates="project", cascade="all, delete-orphan")
