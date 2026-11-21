import os
import re
import hashlib
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.source.base import SourceProvider
from app.services.workspace_service import WorkspaceService
from app.services.storage_service import LocalStorageService
from app.models.source import Source, SourceType, AcquisitionStatus
from app.repositories.source_repository import SourceRepository

logger = logging.getLogger("zentronyx.source.folder")

MAX_FILES_COUNT = 10000


class FolderSourceProvider(SourceProvider):
    def __init__(self, db: AsyncSession):
        self.db = db
        self.source_repo = SourceRepository(db)
        self.storage_service = LocalStorageService()

    def _calculate_directory_fingerprint(self, directory_path: Path) -> str:
        sha256 = hashlib.sha256()
        for root, _, files in sorted(os.walk(directory_path)):
            for f in sorted(files):
                file_p = Path(root) / f
                rel = file_p.relative_to(directory_path)
                sha256.update(str(rel).encode("utf-8"))
                try:
                    with open(file_p, "rb") as fp:
                        while chunk := fp.read(1024 * 1024):
                            sha256.update(chunk)
                except Exception:
                    pass
        return sha256.hexdigest()

    async def acquire(
        self,
        project_id: str,
        files: List[UploadFile],
        paths: Optional[List[str]] = None,
        folder_name: Optional[str] = "source_folder"
    ) -> Source:
        if not files or len(files) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files provided for folder upload."
            )

        if len(files) > MAX_FILES_COUNT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Folder contains too many files ({len(files)} files). Maximum allowed is {MAX_FILES_COUNT}."
            )

        clean_folder_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", (folder_name or "source_folder").strip()) or "source_folder"

        # 1. Create Source Database Entity in PENDING state
        source = await self.source_repo.create(
            project_id=project_id,
            source_type=SourceType.FOLDER,
            original_filename=clean_folder_name,
            acquisition_status=AcquisitionStatus.PENDING
        )

        subdirs = WorkspaceService.initialize_project_workspace(project_id)
        extract_target_dir = subdirs["source"]

        try:
            # 2. State: VALIDATING
            await self.source_repo.update_status(source, AcquisitionStatus.VALIDATING)

            # Clean any previous source files in workspace
            WorkspaceService.cleanup_source_dir(project_id)
            extract_target_dir.mkdir(parents=True, exist_ok=True)
            target_dir_resolved = extract_target_dir.resolve()

            # 3. State: EXTRACTING / SAVING FILES
            await self.source_repo.update_status(source, AcquisitionStatus.EXTRACTING)

            total_size = 0

            for i, upload_file in enumerate(files):
                # Determine relative path inside target folder
                rel_candidate = None
                if paths and i < len(paths) and paths[i]:
                    rel_candidate = paths[i]
                elif upload_file.filename:
                    rel_candidate = upload_file.filename
                else:
                    rel_candidate = f"file_{i}.bin"

                # Strip leading directory indicators and normalize
                clean_rel = rel_candidate.replace("\\", "/").lstrip("/")
                # If clean_rel begins with folder_name prefix (e.g. "my-folder/src/app.py"), keep relative path intact
                dest_path = (extract_target_dir / clean_rel).resolve()

                # Path traversal attack detection
                if not str(dest_path).startswith(str(target_dir_resolved)):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Path traversal attack detected in folder path: {rel_candidate}"
                    )

                dest_path.parent.mkdir(parents=True, exist_ok=True)
                file_size = await self.storage_service.save_file(upload_file.file, dest_path)
                total_size += file_size

                if total_size > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Uploaded folder contents exceed maximum allowed size of {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB."
                    )

            # Compute SHA-256 fingerprint across directory
            fingerprint = self._calculate_directory_fingerprint(extract_target_dir)

            # 4. State: READY
            source.storage_path = str(extract_target_dir)
            source.file_size = total_size
            source.source_fingerprint = fingerprint
            source.acquired_at = datetime.now(timezone.utc)
            await self.source_repo.update_status(source, AcquisitionStatus.READY)

            return source

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Folder acquisition failed for source {source.id}: {error_msg}")
            await self.source_repo.update_status(source, AcquisitionStatus.FAILED, error_message=error_msg)
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Folder ingestion failed: {error_msg}"
            )
