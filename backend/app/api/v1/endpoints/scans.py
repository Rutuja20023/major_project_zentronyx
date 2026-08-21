from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.security.dependencies import get_current_active_user
from app.repositories.project_repository import ProjectRepository
from app.repositories.scan_repository import ScanRepository
from app.orchestrator.engine import ScanOrchestratorEngine
from app.schemas.scan import (
    ScanCreateRequest,
    ScanResponse,
    ScanModuleResponse,
    ScanResultResponse,
)

router = APIRouter(tags=["Scan Orchestrator"])


async def verify_project_ownership(project_id: str, db: AsyncSession, current_user: User):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    if project.owner_id != current_user.id and current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this project"
        )
    return project


@router.post(
    "/projects/{project_id}/scans",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and launch security scan"
)
async def create_scan(
    project_id: str,
    payload: Optional[ScanCreateRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generates scan plan based on project analysis and launches async scan orchestration."""
    await verify_project_ownership(project_id, db, current_user)
    requested = payload.requested_modules if payload else None

    orchestrator = ScanOrchestratorEngine(db)
    scan = await orchestrator.initiate_scan(project_id=project_id, requested_modules=requested)
    return ScanResponse.model_validate(scan)


@router.get(
    "/projects/{project_id}/scans",
    response_model=List[ScanResponse],
    status_code=status.HTTP_200_OK,
    summary="List all scans for project"
)
async def list_project_scans(
    project_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves all security scan executions for a project."""
    await verify_project_ownership(project_id, db, current_user)
    scan_repo = ScanRepository(db)
    scans = await scan_repo.list_by_project(project_id, skip=skip, limit=limit)
    return [ScanResponse.model_validate(s) for s in scans]


@router.get(
    "/projects/{project_id}/scans/{scan_id}",
    response_model=ScanResponse,
    status_code=status.HTTP_200_OK,
    summary="Get scan details by ID"
)
async def get_scan_by_id(
    project_id: str,
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves single scan status and severity summary."""
    await verify_project_ownership(project_id, db, current_user)
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan or scan.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found for this project")
    return ScanResponse.model_validate(scan)


@router.post(
    "/scans/{scan_id}/cancel",
    response_model=ScanResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel a running security scan"
)
async def cancel_scan(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cancels active scan execution and marks active modules as failed/cancelled."""
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    await verify_project_ownership(scan.project_id, db, current_user)
    orchestrator = ScanOrchestratorEngine(db)
    updated_scan = await orchestrator.cancel_scan(scan_id)
    return ScanResponse.model_validate(updated_scan)


@router.get(
    "/scans/{scan_id}/modules",
    response_model=List[ScanModuleResponse],
    status_code=status.HTTP_200_OK,
    summary="Get module execution status for scan"
)
async def get_scan_modules(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves status and timing for each security module in a scan."""
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    await verify_project_ownership(scan.project_id, db, current_user)
    modules = await scan_repo.get_scan_modules(scan_id)
    return [ScanModuleResponse.model_validate(m) for m in modules]


@router.get(
    "/scans/{scan_id}/results",
    response_model=List[ScanResultResponse],
    status_code=status.HTTP_200_OK,
    summary="Get normalized vulnerability findings for scan"
)
async def get_scan_results(
    scan_id: str,
    severity: Optional[str] = None,
    module_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves normalized findings with optional severity or module filters."""
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    await verify_project_ownership(scan.project_id, db, current_user)
    results = await scan_repo.get_scan_results(scan_id, severity=severity, module_type=module_type)
    return [ScanResultResponse.model_validate(r) for r in results]
