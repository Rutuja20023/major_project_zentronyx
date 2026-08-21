import os
from pathlib import Path
from typing import Dict, Any, List
from app.analyzers.base import BaseDetector

MANIFEST_FILENAMES = {
    "requirements.txt",
    "pyproject.toml",
    "Pipfile",
    "setup.py",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "go.mod",
    "go.sum",
    "Cargo.toml",
    "Cargo.lock",
    "package.json",
    "packages.config",
}


class DependencyManifestDetector(BaseDetector):
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        manifests: List[str] = []

        for root, dirs, files in os.walk(source_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv")]
            for file in files:
                if file in MANIFEST_FILENAMES or file.endswith(".csproj"):
                    rel_path = str(Path(root) / file)
                    rel_path_clean = str(Path(rel_path).relative_to(source_path))
                    manifests.append(rel_path_clean)

        return {
            "dependency_manifests": sorted(manifests),
        }
