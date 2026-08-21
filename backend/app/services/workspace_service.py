import os
import stat
import shutil
import sys
import logging
from pathlib import Path
from typing import Dict
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("zentronyx.workspace")


def _handle_remove_readonly(func, path, exc_info_or_exc):
    """Clear read-only attribute and retry deletion on Windows."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


class WorkspaceService:
    @staticmethod
    def safe_rmtree(target_path: Path) -> None:
        """Recursively removes a directory tree, handling read-only files on Windows (e.g. .git objects)."""
        if not target_path.exists():
            return

        # Pre-emptively strip read-only flag on Windows
        if os.name == "nt":
            for root, dirs, files in os.walk(target_path):
                for file_name in files:
                    try:
                        os.chmod(os.path.join(root, file_name), stat.S_IWRITE)
                    except Exception:
                        pass
                for dir_name in dirs:
                    try:
                        os.chmod(os.path.join(root, dir_name), stat.S_IWRITE)
                    except Exception:
                        pass
            try:
                os.chmod(target_path, stat.S_IWRITE)
            except Exception:
                pass

        try:
            if sys.version_info >= (3, 12):
                shutil.rmtree(target_path, onexc=_handle_remove_readonly)
            else:
                shutil.rmtree(target_path, onerror=_handle_remove_readonly)
        except Exception as e:
            logger.warning(f"Initial shutil.rmtree failed for {target_path}: {e}. Retrying with ignore_errors=True fallback.")
            shutil.rmtree(target_path, ignore_errors=True)

    @staticmethod
    def get_project_workspace_root(project_id: str) -> Path:
        """Sanitizes project_id and returns base workspace directory."""
        clean_id = os.path.basename(project_id.strip())
        if not clean_id or ".." in clean_id or "/" in clean_id or "\\" in clean_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid project identifier for workspace allocation"
            )
        base_dir = Path(settings.WORKSPACE_ROOT).resolve()
        project_dir = (base_dir / clean_id).resolve()

        # Strict containment check
        if not str(project_dir).startswith(str(base_dir)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path traversal detected in workspace allocation"
            )
        return project_dir

    @staticmethod
    def initialize_project_workspace(project_id: str) -> Dict[str, Path]:
        """Creates isolated workspace directories for a project."""
        project_root = WorkspaceService.get_project_workspace_root(project_id)
        subdirs = {
            "root": project_root,
            "source": project_root / "source",
            "build": project_root / "build",
            "binaries": project_root / "binaries",
            "reports": project_root / "reports",
            "logs": project_root / "logs",
            "temp": project_root / "temp",
        }

        for path in subdirs.values():
            path.mkdir(parents=True, exist_ok=True)

        return subdirs

    @staticmethod
    def cleanup_project_workspace(project_id: str) -> None:
        """Completely removes project workspace from disk."""
        project_root = WorkspaceService.get_project_workspace_root(project_id)
        if project_root.exists() and project_root.is_dir():
            try:
                WorkspaceService.safe_rmtree(project_root)
                logger.info(f"Workspace cleaned for project {project_id}")
            except Exception as e:
                logger.error(f"Failed to clean workspace for project {project_id}: {str(e)}")

    @staticmethod
    def cleanup_source_dir(project_id: str) -> None:
        """Cleans the source directory inside a project workspace."""
        subdirs = WorkspaceService.initialize_project_workspace(project_id)
        source_dir = subdirs["source"]
        if source_dir.exists():
            for item in source_dir.iterdir():
                if item.is_dir():
                    WorkspaceService.safe_rmtree(item)
                else:
                    try:
                        os.chmod(item, stat.S_IWRITE)
                    except Exception:
                        pass
                    item.unlink(missing_ok=True)

