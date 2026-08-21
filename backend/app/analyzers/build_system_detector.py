import os
from pathlib import Path
from typing import Dict, Any, List
from app.analyzers.base import BaseDetector

BUILD_INDICATORS = [
    ("pip/pyproject", ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"]),
    ("Maven", ["pom.xml"]),
    ("Gradle", ["build.gradle", "build.gradle.kts"]),
    ("Make", ["Makefile", "makefile"]),
    ("CMake", ["CMakeLists.txt"]),
    (".csproj", ["*.csproj", "*.sln"]),
    ("Go Modules", ["go.mod"]),
    ("Cargo", ["Cargo.toml"]),
]


class BuildSystemDetector(BaseDetector):
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        detected_build_systems: List[str] = []

        for root, dirs, files in os.walk(source_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv")]
            for file in files:
                for build_name, patterns in BUILD_INDICATORS:
                    for pattern in patterns:
                        if pattern.startswith("*"):
                            if file.endswith(pattern[1:]):
                                if build_name not in detected_build_systems:
                                    detected_build_systems.append(build_name)
                        elif file == pattern:
                            if build_name not in detected_build_systems:
                                detected_build_systems.append(build_name)

        primary_build_system = detected_build_systems[0] if detected_build_systems else "Custom/None"

        return {
            "build_system": primary_build_system,
            "detected_build_systems": detected_build_systems,
        }
