import logging
from typing import Dict, Type, Optional, List, Any
from app.models.scan import ModuleType
from app.scanners.base import SecurityModule
from app.scanners.semgrep_sast import SemgrepSASTModule
from app.scanners.osv_sca import OSVScannerSCAModule
from app.scanners.owasp_zap_dast import OWASPZAPDASTModule
from app.scanners.binary_analysis import BinaryAnalysisModule
from app.scanners.gnn_malware import GNNMalwareModule

logger = logging.getLogger("zentronyx.scanners.registry")


class SecurityModuleRegistry:
    _instance: Optional["SecurityModuleRegistry"] = None

    def __init__(self):
        self._registry: Dict[ModuleType, Type[SecurityModule]] = {}

    @classmethod
    def get_instance(cls) -> "SecurityModuleRegistry":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._register_defaults()
        return cls._instance

    def register(self, module_type: ModuleType, module_cls: Any) -> None:
        self._registry[module_type] = module_cls
        name = getattr(module_cls, "__name__", type(module_cls).__name__)
        logger.info(f"Registered Security Module: {module_type.value} -> {name}")

    def get_module(self, module_type: ModuleType) -> Optional[SecurityModule]:
        item = self._registry.get(module_type)
        if item:
            if isinstance(item, SecurityModule):
                return item
            return item()
        return None

    def list_modules(self) -> List[ModuleType]:
        return list(self._registry.keys())

    def _register_defaults(self) -> None:
        self.register(ModuleType.SAST, SemgrepSASTModule)
        self.register(ModuleType.SCA, OSVScannerSCAModule)
        self.register(ModuleType.DAST, OWASPZAPDASTModule)
        self.register(ModuleType.BINARY_ANALYSIS, BinaryAnalysisModule)
        self.register(ModuleType.GNN, GNNMalwareModule)


