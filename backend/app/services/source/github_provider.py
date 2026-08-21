import os
import re
import subprocess
import logging
import urllib.parse
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.source.base import SourceProvider
from app.services.workspace_service import WorkspaceService
from app.services.storage_service import LocalStorageService
from app.models.source import Source, SourceType, AcquisitionStatus
from app.repositories.source_repository import SourceRepository

logger = logging.getLogger("zentronyx.source.github")

import ipaddress

BLOCKED_HOSTS = {
    "localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "metadata.google.internal", "::1"
}


class GitHubSourceProvider(SourceProvider):
    def __init__(self, db: AsyncSession):
        self.db = db
        self.source_repo = SourceRepository(db)
        self.storage_service = LocalStorageService()

    @staticmethod
    def validate_and_sanitize_github_url(raw_url: str) -> str:
        """Validates GitHub repository URL and guards against SSRF."""
        url = raw_url.strip()
        parsed = urllib.parse.urlparse(url)

        if parsed.scheme not in ("http", "https"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only HTTP and HTTPS GitHub URLs are permitted."
            )

        hostname = (parsed.hostname or "").lower()

        # Check explicit blocked hosts, local domains, or private IP ranges
        is_private_ip = False
        try:
            ip = ipaddress.ip_address(hostname)
            is_private_ip = ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
        except ValueError:
            pass

        if hostname in BLOCKED_HOSTS or is_private_ip or hostname.endswith(".local") or hostname.startswith("10.") or hostname.startswith("192.168."):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SSRF Protection: Access to internal or loopback addresses is strictly forbidden."
            )

        if hostname != "github.com" and not hostname.endswith(".github.com"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub repository host. Must be github.com"
            )

        path = parsed.path.rstrip("/")
        if path.endswith(".git"):
            path = path[:-4]

        match = re.match(r"^/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)$", path)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub repository URL format. Use format: https://github.com/owner/repo"
            )

        clean_url = f"https://github.com/{match.group(1)}/{match.group(2)}.git"
        return clean_url


    async def acquire(self, project_id: str, repository_url: str, branch: Optional[str] = None) -> Source:
        clean_url = self.validate_and_sanitize_github_url(repository_url)
        target_branch = branch.strip() if branch and branch.strip() else None

        source = await self.source_repo.create(
            project_id=project_id,
            source_type=SourceType.GITHUB,
            source_url=clean_url,
            branch=target_branch,
            acquisition_status=AcquisitionStatus.PENDING
        )

        subdirs = WorkspaceService.initialize_project_workspace(project_id)
        source_dir = subdirs["source"]

        try:
            # 1. State: VALIDATING
            await self.source_repo.update_status(source, AcquisitionStatus.VALIDATING)

            # Clean any previous source files in workspace
            WorkspaceService.cleanup_source_dir(project_id)

            # 2. State: ACQUIRING
            await self.source_repo.update_status(source, AcquisitionStatus.ACQUIRING)

            # Build safe command vector (NO shell=True)
            cmd = ["git", "clone", "--depth", "1"]
            if target_branch:
                cmd.extend(["--branch", target_branch])
            cmd.extend([clean_url, str(source_dir)])

            logger.info(f"Cloning repository into workspace: {' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=180,  # 3 minutes timeout
                shell=False   # NO shell execution
            )

            if result.returncode != 0:
                err_text = result.stderr or result.stdout or "Unknown git clone failure"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"GitHub repository clone failed: {err_text.strip()}"
                )

            # Retrieve commit SHA from cloned repository
            commit_res = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=str(source_dir),
                capture_output=True,
                text=True,
                timeout=15,
                shell=False
            )
            commit_hash = commit_res.stdout.strip() if commit_res.returncode == 0 else "UNKNOWN"

            # Compute source fingerprint (SHA-256 of URL + commit hash)
            fingerprint_input = f"{clean_url}:{target_branch or 'default'}:{commit_hash}"
            fingerprint = self.storage_service.calculate_string_fingerprint(fingerprint_input)

            # Calculate total cloned size
            total_size = sum(f.stat().st_size for f in source_dir.glob("**/*") if f.is_file())

            # 3. State: READY
            source.storage_path = str(source_dir)
            source.commit_hash = commit_hash
            source.source_fingerprint = fingerprint
            source.file_size = total_size
            source.acquired_at = datetime.now(timezone.utc)
            await self.source_repo.update_status(source, AcquisitionStatus.READY)

            return source

        except Exception as e:
            error_msg = str(e)
            logger.error(f"GitHub acquisition failed for source {source.id}: {error_msg}")
            await self.source_repo.update_status(source, AcquisitionStatus.FAILED, error_message=error_msg)
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"GitHub repository acquisition error: {error_msg}"
            )
