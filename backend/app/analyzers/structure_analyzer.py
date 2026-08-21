import os
from pathlib import Path
from typing import Dict, Any, List
from app.analyzers.base import BaseDetector


class ProjectStructureAnalyzer(BaseDetector):
    def detect(self, source_path: Path, context: Dict[str, Any]) -> Dict[str, Any]:
        total_files = 0
        total_lines = 0
        code_lines = 0
        comment_lines = 0
        blank_lines = 0

        test_files: List[str] = []
        config_files: List[str] = []
        doc_files: List[str] = []
        warnings: List[str] = []

        for root, dirs, files in os.walk(source_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "build", "dist", "target")]
            for file in files:
                total_files += 1
                filepath = Path(root) / file
                rel_path = str(filepath.relative_to(source_path))
                fname_lower = file.lower()

                # Test files check
                if (
                    "test" in fname_lower
                    or rel_path.startswith("tests/")
                    or rel_path.startswith("test/")
                    or fname_lower.endswith("_test.go")
                    or fname_lower.endswith("test.java")
                ):
                    test_files.append(rel_path)

                # Config files check
                if (
                    file in (".env.example", "config.json", "config.yaml", "config.yml", "appsettings.json", "docker-compose.yml")
                    or file.endswith(".conf")
                    or file.endswith(".ini")
                ):
                    config_files.append(rel_path)

                # Docs check
                if file.startswith("README") or file.startswith("CHANGELOG") or rel_path.startswith("docs/"):
                    doc_files.append(rel_path)

                # Lines of code counting for standard text files < 500KB
                try:
                    if filepath.stat().st_size < 500 * 1024:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            for line in f:
                                total_lines += 1
                                stripped = line.strip()
                                if not stripped:
                                    blank_lines += 1
                                elif (
                                    stripped.startswith("#")
                                    or stripped.startswith("//")
                                    or stripped.startswith("/*")
                                    or stripped.startswith("*")
                                ):
                                    comment_lines += 1
                                else:
                                    code_lines += 1
                except Exception:
                    pass

        if total_files == 0:
            warnings.append("Project workspace appears to be empty or contains no readable files.")

        return {
            "statistics": {
                "total_files": total_files,
                "total_lines": total_lines,
                "code_lines": code_lines,
                "comment_lines": comment_lines,
                "blank_lines": blank_lines,
                "test_files_count": len(test_files),
                "config_files_count": len(config_files),
                "doc_files_count": len(doc_files),
            },
            "test_files": test_files[:20],  # sample limit
            "config_files": config_files[:20],
            "doc_files": doc_files[:20],
            "warnings": warnings,
        }
