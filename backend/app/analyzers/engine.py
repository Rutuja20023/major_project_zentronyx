import os
import logging
from pathlib import Path
from typing import Dict, Any, List
from fastapi import HTTPException, status

from app.analyzers.language_detector import LanguageDetector
from app.analyzers.framework_detector import FrameworkDetector
from app.analyzers.build_system_detector import BuildSystemDetector
from app.analyzers.dependency_manifest_detector import DependencyManifestDetector
from app.analyzers.structure_analyzer import ProjectStructureAnalyzer
from app.analyzers.entry_point_detector import EntryPointDetector
from app.analyzers.application_type_detector import ApplicationTypeDetector
from app.analyzers.binary_capability_detector import BinaryCapabilityDetector

logger = logging.getLogger("zentronyx.analysis.engine")


class ProjectAnalysisEngine:
    """
    Project Analysis Engine orchestrating modular detectors in a safe, read-only pipeline.
    Does NOT execute user code, scripts, package managers, or shell commands.
    """

    def __init__(self):
        self.language_detector = LanguageDetector()
        self.framework_detector = FrameworkDetector()
        self.build_system_detector = BuildSystemDetector()
        self.manifest_detector = DependencyManifestDetector()
        self.structure_analyzer = ProjectStructureAnalyzer()
        self.entry_point_detector = EntryPointDetector()
        self.application_type_detector = ApplicationTypeDetector()
        self.binary_capability_detector = BinaryCapabilityDetector()

    def analyze(self, source_path: Path) -> Dict[str, Any]:
        source_resolved = source_path.resolve()
        if not source_resolved.exists() or not source_resolved.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target source directory does not exist: {source_path}"
            )

        logger.info(f"Starting Project Analysis for workspace: {source_resolved}")
        context: Dict[str, Any] = {}

        # 1. Structure & Statistics
        struct_res = self.structure_analyzer.detect(source_resolved, context)
        context.update(struct_res)

        # 2. Languages
        lang_res = self.language_detector.detect(source_resolved, context)
        context.update(lang_res)

        # 3. Dependency Manifests
        manifest_res = self.manifest_detector.detect(source_resolved, context)
        context.update(manifest_res)

        # 4. Build Systems
        build_res = self.build_system_detector.detect(source_resolved, context)
        context.update(build_res)

        # 5. Frameworks
        framework_res = self.framework_detector.detect(source_resolved, context)
        context.update(framework_res)

        # 6. Entry Points
        entry_res = self.entry_point_detector.detect(source_resolved, context)
        context.update(entry_res)

        # 7. Application Type
        app_type_res = self.application_type_detector.detect(source_resolved, context)
        context.update(app_type_res)

        # 8. Binary Capability
        binary_res = self.binary_capability_detector.detect(source_resolved, context)
        context.update(binary_res)

        warnings: List[str] = list(context.get("warnings", []))
        if context.get("primary_language") == "Unknown":
            warnings.append("Could not determine primary language from source code files.")

        final_result = {
            "primary_language": context.get("primary_language", "Unknown"),
            "detected_languages": context.get("detected_languages", []),
            "language_statistics": context.get("language_statistics", {}),
            "framework": context.get("framework", "None"),
            "framework_version": context.get("framework_version"),
            "build_system": context.get("build_system", "Custom/None"),
            "dependency_manifests": context.get("dependency_manifests", []),
            "entry_points": context.get("entry_points", []),
            "application_type": context.get("application_type", "GENERAL_APPLICATION"),
            "binary_capable": context.get("binary_capable", False),
            "binary_type": context.get("binary_type", "NONE"),
            "statistics": context.get("statistics", {}),
            "warnings": warnings,
            "confidence": 0.95 if context.get("primary_language") != "Unknown" else 0.5,
            "status": "COMPLETED",
        }

        logger.info(f"Analysis completed successfully for {source_resolved}: Primary Lang = {final_result['primary_language']}, Framework = {final_result['framework']}")
        return final_result
