import os
from pathlib import Path
from typing import Dict, Any, List
from app.analyzers.base import BaseDetector

EXTENSION_MAP = {
    ".py": "Python",
    ".pyi": "Python",
    ".java": "Java",
    ".c": "C",
    ".h": "C",
    ".cpp": "C++",
    ".hpp": "C++",
    ".cc": "C++",
    ".hh": "C++",
    ".cxx": "C++",
    ".cs": "C#",
    ".csx": "C#",
    ".go": "Go",
    ".rs": "Rust",
}


class LanguageDetector(BaseDetector):
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        counts: Dict[str, int] = {}
        bytes_map: Dict[str, int] = {}

        total_files = 0
        total_bytes = 0

        for root, dirs, files in os.walk(source_path):
            # Exclude build, node_modules, venv, git
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "__pycache__", "target", "bin", "obj")]
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in EXTENSION_MAP:
                    lang = EXTENSION_MAP[ext]
                    file_path = Path(root) / file
                    try:
                        size = file_path.stat().st_size
                    except Exception:
                        size = 0

                    counts[lang] = counts.get(lang, 0) + 1
                    bytes_map[lang] = bytes_map.get(lang, 0) + size
                    total_files += 1
                    total_bytes += size

        primary_language = None
        if counts:
            primary_language = max(counts.items(), key=lambda item: item[1])[0]

        detected_languages = sorted(list(counts.keys()))

        language_stats = {}
        for lang, count in counts.items():
            percentage = round((count / total_files) * 100, 2) if total_files > 0 else 0.0
            language_stats[lang] = {
                "file_count": count,
                "byte_size": bytes_map[lang],
                "percentage": percentage,
            }

        return {
            "primary_language": primary_language or "Unknown",
            "detected_languages": detected_languages,
            "language_statistics": language_stats,
            "total_language_files": total_files,
        }
