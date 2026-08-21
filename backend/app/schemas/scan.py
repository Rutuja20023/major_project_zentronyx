from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.scan import ModuleType, ScanStatus, ModuleStatus, FindingSeverity, FindingConfidence


class ScanCreateRequest(BaseModel):
    requested_modules: Optional[List[ModuleType]] = Field(
        None, description="Optional explicit list of modules to execute (SAST, SCA, DAST, BINARY_ANALYSIS, GNN). Defaults to all applicable."
    )


class ScanModuleResponse(BaseModel):
    id: str
    scan_id: str
    module_type: ModuleType
    status: ModuleStatus
    findings_count: int
    skip_reason: Optional[str] = None
    error_message: Optional[str] = None
    execution_time_ms: int
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScanResultResponse(BaseModel):
    id: str
    scan_id: str
    scan_module_id: Optional[str] = None
    module_type: ModuleType
    title: str
    description: str
    severity: FindingSeverity
    confidence: FindingConfidence
    category: str
    file: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None
    scanner: str
    rule_id: str
    recommendation: Optional[str] = None
    raw_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScanResponse(BaseModel):
    id: str
    project_id: str
    source_id: Optional[str] = None
    analysis_id: Optional[str] = None
    source_fingerprint: Optional[str] = None

    status: ScanStatus
    findings_count: int
    severity_summary: Optional[Dict[str, int]] = None
    error_message: Optional[str] = None

    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
