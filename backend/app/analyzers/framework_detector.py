import os
import re
from pathlib import Path
from typing import Dict, Any, Optional
from app.analyzers.base import BaseDetector

FRAMEWORK_PATTERNS = [
    # Python
    ("FastAPI", [r"from\s+fastapi\s+import", r"import\s+fastapi"], [".py", "requirements.txt", "pyproject.toml"]),
    ("Django", [r"from\s+django\s+import", r"import\s+django"], [".py", "requirements.txt", "pyproject.toml", "manage.py"]),
    ("Flask", [r"from\s+flask\s+import", r"import\s+flask"], [".py", "requirements.txt", "pyproject.toml"]),
    # Java
    ("Spring Boot", [r"org\.springframework\.boot", r"spring-boot-starter"], [".java", "pom.xml", "build.gradle"]),
    ("Spring", [r"org\.springframework"], [".java", "pom.xml", "build.gradle"]),
    # C#
    ("ASP.NET Core", [r"Microsoft\.AspNetCore", r"Microsoft\.NET\.Sdk\.Web"], [".cs", ".csproj"]),
    # Go
    ("Gin", [r"github\.com/gin-gonic/gin"], [".go", "go.mod"]),
    ("Echo", [r"github\.com/labstack/echo"], [".go", "go.mod"]),
    ("Fiber", [r"github\.com/gofiber/fiber"], [".go", "go.mod"]),
    # Rust
    ("Actix", [r"actix-web"], [".rs", "Cargo.toml"]),
    ("Axum", [r"axum"], [".rs", "Cargo.toml"]),
    ("Rocket", [r"rocket"], [".rs", "Cargo.toml"]),
]


class FrameworkDetector(BaseDetector):
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        detected_framework = None
        framework_version = None

        # Inspect manifest files first
        manifests = context.get("dependency_manifests", [])
        for root, dirs, files in os.walk(source_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "__pycache__")]
            for file in files:
                ext = Path(file).suffix.lower()
                filepath = Path(root) / file
                
                # Limit size of scanned source files to 1MB
                try:
                    if filepath.stat().st_size > 1024 * 1024:
                        continue
                    content = filepath.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                for framework_name, patterns, file_types in FRAMEWORK_PATTERNS:
                    if any(file.endswith(ft) or ext == ft for ft in file_types):
                        for pattern in patterns:
                            if re.search(pattern, content):
                                detected_framework = framework_name
                                break
                    if detected_framework:
                        break
                if detected_framework:
                    break
            if detected_framework:
                break

        return {
            "framework": detected_framework or "None",
            "framework_version": framework_version,
        }
