from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class ServiceHealth(BaseModel):
    status: str = Field(..., description="Service status: healthy, degraded, or unhealthy")
    latency_ms: Optional[float] = Field(None, description="Response time in milliseconds")
    details: Optional[str] = Field(None, description="Status details or message")


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall system health status")
    version: str = Field(..., description="Application version")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    environment: str = Field(..., description="Current environment mode")
    services: Dict[str, ServiceHealth] = Field(..., description="Individual service health details")
