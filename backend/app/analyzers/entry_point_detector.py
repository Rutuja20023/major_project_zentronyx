import os
from pathlib import Path
from typing import Dict, Any, List
from app.analyzers.base import BaseDetector

ENTRY_POINT_PATTERNS = [
    "main.py", "app.py", "server.py", "wsgi.py", "asgi.py", "manage.py",
    "Main.java", "Application.java", "main.go", "main.rs", "Program.cs", "Startup.cs",
    "index.js", "index.ts", "main.c", "main.cpp"
]


class EntryPointDetector(BaseDetector):
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        entry_points: List[str] = []

        for root, dirs, files in os.walk(source_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "build", "dist")]
            for file in files:
                if file in ENTRY_POINT_PATTERNS or file == "main.py" or file == "app.py":
                    rel_path = str((Path(root) / file).relative_to(source_path))
                    entry_points.append(rel_path)

        return {
            "entry_points": sorted(entry_points),
        }
