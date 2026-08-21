from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.models.source import SourceType, AcquisitionStatus


class GitHubIngestRequest(BaseModel):
    repository_url: str = Field(..., description="Public GitHub repository HTTP/HTTPS URL")
    branch: Optional[str] = Field(None, max_length=100, description="Target branch name (default main/master)")

    @field_validator("repository_url")
    def validate_github_url(cls, v: str) -> str:
        url = v.strip()
        if not (url.startswith("https://github.com/") or url.startswith("http://github.com/")):
            raise ValueError("Repository URL must be a valid GitHub URL (https://github.com/owner/repo)")
        return url


class SourceResponse(BaseModel):
    id: str
    project_id: str
    source_type: SourceType
    source_url: Optional[str] = None
    original_filename: Optional[str] = None
    storage_path: Optional[str] = None
    branch: Optional[str] = None
    commit_hash: Optional[str] = None
    source_fingerprint: Optional[str] = None
    acquisition_status: AcquisitionStatus
    file_size: int
    acquired_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
