from pathlib import Path
from typing import Dict, Any
from app.analyzers.base import BaseDetector


class ApplicationTypeDetector(BaseDetector):
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        framework = context.get("framework", "None")
        manifests = context.get("dependency_manifests", [])
        entry_points = context.get("entry_points", [])

        if framework in ("FastAPI", "Django", "Flask", "Spring Boot", "Spring", "ASP.NET Core", "Gin", "Echo", "Fiber", "Actix", "Axum", "Rocket"):
            app_type = "WEB_APP"
        elif any("docker-compose" in m or "Dockerfile" in m for m in context.get("config_files", [])):
            app_type = "MICROSERVICE"
        elif entry_points:
            app_type = "CLI"
        elif manifests:
            app_type = "LIBRARY"
        else:
            app_type = "GENERAL_APPLICATION"

        return {
            "application_type": app_type,
        }
