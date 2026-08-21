from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from app.models.scan import ModuleType, FindingSeverity, FindingConfidence


class FindingData:
    def __init__(
        self,
        title: str,
        description: str,
        severity: FindingSeverity,
        confidence: FindingConfidence,
        category: str,
        scanner: str,
        rule_id: str,
        file: Optional[str] = None,
        line: Optional[int] = None,
        column: Optional[int] = None,
        recommendation: Optional[str] = None,
        raw_metadata: Optional[Dict[str, Any]] = None
    ):
        self.title = title
        self.description = description
        self.severity = severity
        self.confidence = confidence
        self.category = category
        self.scanner = scanner
        self.rule_id = rule_id
        self.file = file
        self.line = line
        self.column = column
        self.recommendation = recommendation
        self.raw_metadata = raw_metadata or {}


class SecurityModule(ABC):
    """Abstract interface for security scanning modules."""

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def validate(self, context: Dict[str, Any]) -> bool:
        pass

    @abstractmethod
    async def prepare(self, context: Dict[str, Any]) -> bool:
        pass

    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        pass

    @abstractmethod
    async def cancel(self) -> None:
        pass

    @abstractmethod
    async def cleanup(self) -> None:
        pass
