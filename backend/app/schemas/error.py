from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    loc: Optional[List[str]] = None
    msg: str
    type: Optional[str] = None


class ErrorResponseBody(BaseModel):
    code: str = Field(..., description="Error classification code")
    message: str = Field(..., description="Human-readable error description")
    details: Optional[List[ErrorDetail]] = Field(None, description="Detailed validation or parameter errors")


class ErrorResponse(BaseModel):
    error: ErrorResponseBody
