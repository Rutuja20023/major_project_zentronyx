from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any


class BaseDetector(ABC):
    """Abstract base interface for all modular project analysis detectors."""

    @abstractmethod
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes source code directory without executing code or binaries.
        Returns detector findings dictionary.
        """
        pass
