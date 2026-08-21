from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class GraphNodeInput(BaseModel):
    id: int
    type: str = Field(..., description="Node type e.g. HEADER, SECTION, IMPORT_LIB, FUNCTION, STRING_BLOCK")
    features: List[float] = Field(..., description="Numerical node feature vector")


class GraphEdgeInput(BaseModel):
    source: int
    target: int
    relation: str = Field(..., description="Relationship type e.g. CONTAINS, IMPORTS, REFERENCES")


class GraphDataInput(BaseModel):
    nodes: List[GraphNodeInput]
    edges: List[GraphEdgeInput]
    num_nodes: int
    binary_format: str = Field(default="ELF", description="ELF or PE")
    architecture: str = Field(default="x86_64")
    file_size_bytes: int = 0
    sha256: Optional[str] = None


class MalwarePredictRequest(BaseModel):
    project_id: Optional[str] = None
    source_id: Optional[str] = None
    graph_data: GraphDataInput
    feature_schema_version: str = Field(default="1.0.0")


class MalwarePredictResponse(BaseModel):
    prediction: str = Field(..., description="BENIGN or MALICIOUS")
    malware_probability: float = Field(..., ge=0.0, le=1.0)
    benign_probability: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    feature_schema_version: str
    inference_time_ms: float
    metadata: Dict[str, Any] = Field(default_factory=dict)
