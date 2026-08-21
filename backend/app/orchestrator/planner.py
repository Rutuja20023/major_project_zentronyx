import logging
from typing import Dict, Any, List, Optional
from app.models.scan import ModuleType
from app.models.analysis import ProjectAnalysis

logger = logging.getLogger("zentronyx.orchestrator.planner")


class ScanPlan:
    def __init__(
        self,
        source_fingerprint: Optional[str],
        analysis_id: Optional[str],
        selected_modules: List[ModuleType],
        applicable_modules: List[ModuleType],
        skipped_modules: List[ModuleType],
        skip_reasons: Dict[ModuleType, str],
        execution_order: List[ModuleType],
        timeouts: Dict[ModuleType, int]
    ):
        self.source_fingerprint = source_fingerprint
        self.analysis_id = analysis_id
        self.selected_modules = selected_modules
        self.applicable_modules = applicable_modules
        self.skipped_modules = skipped_modules
        self.skip_reasons = skip_reasons
        self.execution_order = execution_order
        self.timeouts = timeouts


class ScanPlanner:
    """
    Scan Planner generates deterministic scan execution plans by evaluating project analysis.
    """

    @staticmethod
    def generate_plan(
        analysis: Optional[ProjectAnalysis],
        requested_modules: Optional[List[ModuleType]] = None
    ) -> ScanPlan:
        all_modules = [
            ModuleType.SAST,
            ModuleType.SCA,
            ModuleType.DAST,
            ModuleType.BINARY_ANALYSIS,
            ModuleType.GNN,
        ]

        target_modules = requested_modules if requested_modules else all_modules

        applicable_modules: List[ModuleType] = []
        skipped_modules: List[ModuleType] = []
        skip_reasons: Dict[ModuleType, str] = {}

        # Default fallback values if analysis is missing
        primary_lang = analysis.primary_language if analysis else "Unknown"
        detected_langs = analysis.detected_languages if analysis else []
        manifests = analysis.dependency_manifests if analysis else []
        framework = analysis.framework if analysis else "None"
        binary_capable = analysis.binary_capable if analysis else False

        for mod in target_modules:
            if mod == ModuleType.SAST:
                if primary_lang != "Unknown" or detected_langs:
                    applicable_modules.append(mod)
                else:
                    skipped_modules.append(mod)
                    skip_reasons[mod] = "No supported source code files detected."

            elif mod == ModuleType.SCA:
                if manifests:
                    applicable_modules.append(mod)
                else:
                    skipped_modules.append(mod)
                    skip_reasons[mod] = "No dependency manifests (e.g. requirements.txt, pom.xml, go.mod) detected."

            elif mod == ModuleType.DAST:
                if framework != "None":
                    applicable_modules.append(mod)
                else:
                    skipped_modules.append(mod)
                    skip_reasons[mod] = "No web application framework (FastAPI, Spring, ASP.NET, etc.) detected."

            elif mod == ModuleType.BINARY_ANALYSIS:
                if binary_capable:
                    applicable_modules.append(mod)
                else:
                    skipped_modules.append(mod)
                    skip_reasons[mod] = "Project target is non-compiled script codebase without binary production capability."

            elif mod == ModuleType.GNN:
                if primary_lang != "Unknown" or detected_langs:
                    applicable_modules.append(mod)
                else:
                    skipped_modules.append(mod)
                    skip_reasons[mod] = "Insufficient source graph structure for GNN analysis."

        timeouts = {
            ModuleType.SAST: 120,
            ModuleType.SCA: 60,
            ModuleType.DAST: 180,
            ModuleType.BINARY_ANALYSIS: 120,
            ModuleType.GNN: 90,
        }

        return ScanPlan(
            source_fingerprint=analysis.source_fingerprint if analysis else None,
            analysis_id=analysis.id if analysis else None,
            selected_modules=target_modules,
            applicable_modules=applicable_modules,
            skipped_modules=skipped_modules,
            skip_reasons=skip_reasons,
            execution_order=applicable_modules,
            timeouts=timeouts
        )
