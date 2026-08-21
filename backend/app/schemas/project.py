from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl
from app.models.project import RiskLevel


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    repository_url: Optional[str] = Field(None, max_length=512)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    repository_url: Optional[str] = Field(None, max_length=512)


class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    risk_score: float
    risk_level: RiskLevel
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
