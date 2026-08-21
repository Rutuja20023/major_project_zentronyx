from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ProjectAnalysisResponse(BaseModel):
    id: str
    project_id: str
    source_id: Optional[str] = None
    source_fingerprint: Optional[str] = None

    primary_language: Optional[str] = None
    detected_languages: Optional[List[str]] = None
    language_statistics: Optional[Dict[str, Any]] = None

    framework: Optional[str] = None
    framework_version: Optional[str] = None
    build_system: Optional[str] = None

    dependency_manifests: Optional[List[str]] = None
    entry_points: Optional[List[str]] = None

    application_type: Optional[str] = None
    binary_capable: bool
    binary_type: Optional[str] = None

    statistics: Optional[Dict[str, Any]] = None
    warnings: Optional[List[str]] = None
    confidence: float
    status: str

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
