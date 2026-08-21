import os
import re
import zipfile
import logging
from pathlib import Path
from typing import BinaryIO
from datetime import datetime, timezone
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.source.base import SourceProvider
from app.services.workspace_service import WorkspaceService
from app.services.storage_service import LocalStorageService
from app.models.source import Source, SourceType, AcquisitionStatus
from app.repositories.source_repository import SourceRepository

logger = logging.getLogger("zentronyx.source.zip")

MAX_FILES_COUNT = 10000
MAX_UNCOMPRESSED_SIZE_BYTES = 524288000  # 500MB


class ZipSourceProvider(SourceProvider):
    def __init__(self, db: AsyncSession):
        self.db = db
        self.source_repo = SourceRepository(db)
        self.storage_service = LocalStorageService()

    async def acquire(self, project_id: str, upload_file: UploadFile) -> Source:
        filename = upload_file.filename or "source.zip"

        # 1. Extension Check
        if not filename.lower().endswith(".zip"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Only .zip archives are supported."
            )

        # Secure filename sanitization
        safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", Path(filename).name)

        # 2. Create Source Database Entity in PENDING state
        source = await self.source_repo.create(
            project_id=project_id,
            source_type=SourceType.ZIP,
            original_filename=safe_filename,
            acquisition_status=AcquisitionStatus.PENDING
        )

        subdirs = WorkspaceService.initialize_project_workspace(project_id)
        temp_zip_path = subdirs["temp"] / f"{source.id}_{safe_filename}"
        extract_target_dir = subdirs["source"]

        try:
            # 3. State: VALIDATING
            await self.source_repo.update_status(source, AcquisitionStatus.VALIDATING)

            # Save uploaded archive to temp workspace
            total_size = await self.storage_service.save_file(upload_file.file, temp_zip_path)

            if total_size > settings.MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Uploaded ZIP file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB."
                )

            # Check Magic Bytes for ZIP format
            with open(temp_zip_path, "rb") as f:
                header = f.read(4)
                if not header.startswith(b"PK\x03\x04") and not header.startswith(b"PK\x05\x06"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="File content header validation failed. File is not a valid ZIP archive."
                    )

            # Calculate SHA-256 fingerprint
            fingerprint = self.storage_service.calculate_fingerprint(temp_zip_path)

            # 4. State: EXTRACTING
            await self.source_repo.update_status(source, AcquisitionStatus.EXTRACTING)

            # Clean any previous source files in workspace
            WorkspaceService.cleanup_source_dir(project_id)

            # Inspect and validate ZIP contents safely (Zip Slip & Bomb protection)
            with zipfile.ZipFile(temp_zip_path, "r") as zf:
                infolist = zf.infolist()

                if len(infolist) > MAX_FILES_COUNT:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"ZIP archive contains too many files ({len(infolist)} files). Maximum allowed is {MAX_FILES_COUNT}."
                    )

                total_uncompressed = sum(info.file_size for info in infolist)
                if total_uncompressed > MAX_UNCOMPRESSED_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"ZIP uncompressed payload exceeds maximum limit of {MAX_UNCOMPRESSED_SIZE_BYTES // (1024*1024)}MB."
                    )

                target_dir_resolved = extract_target_dir.resolve()

                for member in infolist:
                    # Symlink protection check (unix mode bit for symlink is 0o120000)
                    is_symlink = (member.external_attr >> 16) & 0o120000 == 0o120000
                    if is_symlink:
                        logger.warning(f"Skipping symlink entry in ZIP: {member.filename}")
                        continue

                    # Zip Slip Protection & Safe Relative Path resolution
                    raw_name = member.filename.lstrip("/\\")
                    if not raw_name:
                        continue
                    member_path = Path(raw_name)
                    resolved_dest = (extract_target_dir / member_path).resolve()

                    if not str(resolved_dest).startswith(str(target_dir_resolved)):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Zip Slip malicious path traversal attack detected in member: {member.filename}"
                        )

                    # Extract member safely with sanitized target path
                    if member.is_dir():
                        resolved_dest.mkdir(parents=True, exist_ok=True)
                    else:
                        resolved_dest.parent.mkdir(parents=True, exist_ok=True)
                        with zf.open(member) as source_f, open(resolved_dest, "wb") as target_f:
                            target_f.write(source_f.read())


            # 5. State: READY
            source.storage_path = str(extract_target_dir)
            source.file_size = total_size
            source.source_fingerprint = fingerprint
            source.acquired_at = datetime.now(timezone.utc)
            await self.source_repo.update_status(source, AcquisitionStatus.READY)

            return source

        except Exception as e:
            error_msg = str(e)
            logger.error(f"ZIP acquisition failed for source {source.id}: {error_msg}")
            await self.source_repo.update_status(source, AcquisitionStatus.FAILED, error_message=error_msg)
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ZIP extraction failure: {error_msg}"
            )
        finally:
            # Always clean temp upload zip archive
            self.storage_service.delete_file(temp_zip_path)
