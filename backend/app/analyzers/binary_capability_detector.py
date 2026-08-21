from pathlib import Path
from typing import Dict, Any
from app.analyzers.base import BaseDetector


class BinaryCapabilityDetector(BaseDetector):
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        detected_langs = context.get("detected_languages", [])
        build_system = context.get("build_system", "")

        binary_capable = False
        binary_type = None

        if "C" in detected_langs or "C++" in detected_langs or "Make" in build_system or "CMake" in build_system:
            binary_capable = True
            binary_type = "ELF / PE Binary"
        elif "Go" in detected_langs or "Go Modules" in build_system:
            binary_capable = True
            binary_type = "GO_BINARY"
        elif "Rust" in detected_langs or "Cargo" in build_system:
            binary_capable = True
            binary_type = "RUST_BINARY"
        elif "C#" in detected_langs or ".csproj" in build_system:
            binary_capable = True
            binary_type = "DOTNET_EXE"
        elif "Java" in detected_langs or build_system in ("Maven", "Gradle"):
            binary_capable = True
            binary_type = "JAR"

        return {
            "binary_capable": binary_capable,
            "binary_type": binary_type or "NONE",
        }
