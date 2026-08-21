from abc import ABC, abstractmethod
from typing import Any, Dict
from app.models.source import Source


class SourceProvider(ABC):
    @abstractmethod
    async def acquire(self, project_id: str, **kwargs) -> Source:
        """Acquires source code artifact and populates target workspace."""
        pass
