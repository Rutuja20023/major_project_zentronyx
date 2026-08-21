import hmac
import hashlib
import logging
from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException, Header, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.source_repository import SourceRepository
from app.services.workspace_service import WorkspaceService
from app.orchestrator.engine import ScanOrchestratorEngine
from app.models.audit import AuditLog

router = APIRouter(prefix="/webhooks", tags=["GitHub Webhook Integration"])
logger = logging.getLogger("zentronyx.webhooks.github")


def verify_github_signature(raw_body: bytes, signature_header: str, secret: str) -> bool:
    """Validates GitHub HMAC SHA-256 signature to prevent unauthorized webhook spoofing."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected_sig = signature_header.split("=")[1]
    computed_sig = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_sig, computed_sig)


@router.post(
    "/github",
    status_code=status.HTTP_200_OK,
    summary="GitHub Webhook handler for automated push trigger security scans"
)
async def github_webhook_handler(
    request: Request,
    x_github_event: str = Header(None, alias="X-GitHub-Event"),
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    db: AsyncSession = Depends(get_db)
):
    raw_body = await request.body()
    secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", "zentronyx_webhook_secret_key_prod")

    # Validate HMAC Signature
    if not verify_github_signature(raw_body, x_hub_signature_256 or "", secret):
        logger.warning("GitHub webhook signature validation failed.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid GitHub webhook signature"
        )

    payload = await request.json()

    if x_github_event != "push":
        return {"status": "ignored", "event": x_github_event}

    repo_info = payload.get("repository", {})
    clone_url = repo_info.get("clone_url") or repo_info.get("html_url")
    ref = payload.get("ref", "refs/heads/main")
    branch = ref.replace("refs/heads/", "")
    after_commit = payload.get("after", "head")

    if not clone_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No repository URL in webhook payload")

    # Identify matching project by repository URL
    project_repo = ProjectRepository(db)
    projects = await project_repo.list_all(skip=0, limit=100)
    matched_project = next(
        (p for p in projects if p.repository_url and p.repository_url.lower() == clone_url.lower()), None
    )

    if not matched_project:
        logger.info(f"Webhook received for unmonitored repository: {clone_url}")
        return {"status": "unmonitored_repository", "repository": clone_url}

    # Acquire Git commit source
    from app.services.github_service import GitHubService
    source_repo = SourceRepository(db)
    source = await source_repo.create(
        project_id=matched_project.id,
        source_type="GITHUB",
        source_url=clone_url,
        branch=branch,
        commit_hash=after_commit[:8] if after_commit else "head",
        acquisition_status="ACQUIRING"
    )

    workspace_source = WorkspaceService.get_project_workspace_root(matched_project.id) / "source"
    try:
        await GitHubService.clone_repository(clone_url, workspace_source, branch)
        await source_repo.update_status(source.id, "READY")
    except Exception as e:
        await source_repo.update_status(source.id, "FAILED", error_message=str(e))


    # Launch automated scan orchestration
    orchestrator = ScanOrchestratorEngine(db)
    scan = await orchestrator.initiate_scan(project_id=matched_project.id)

    # Audit log entry
    audit = AuditLog(
        user_id="GITHUB_WEBHOOK",
        action="WEBHOOK_PUSH_SCAN_TRIGGER",
        resource_type="PROJECT",
        resource_id=matched_project.id,
        details={"clone_url": clone_url, "commit": after_commit, "scan_id": scan.id}
    )
    db.add(audit)
    await db.commit()

    logger.info(f"GitHub webhook successfully triggered scan #{scan.id} for project '{matched_project.name}'")

    return {
        "status": "scan_initiated",
        "project_id": matched_project.id,
        "scan_id": scan.id,
        "commit": after_commit
    }
