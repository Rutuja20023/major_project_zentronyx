from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.security.dependencies import get_current_active_user
from app.repositories.project_repository import ProjectRepository
from app.repositories.source_repository import SourceRepository
from app.schemas.source import SourceResponse, GitHubIngestRequest
from app.services.source.zip_provider import ZipSourceProvider
from app.services.source.github_provider import GitHubSourceProvider
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/projects/{project_id}/sources", tags=["Sources"])


async def verify_project_ownership(
    project_id: str,
    db: AsyncSession,
    current_user: User
):
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
    "/upload",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and extract ZIP source archive"
)
async def upload_zip_source(
    project_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Uploads a ZIP archive, validates magic bytes and path traversal, and extracts to workspace."""
    await verify_project_ownership(project_id, db, current_user)
    provider = ZipSourceProvider(db)
    source = await provider.acquire(project_id=project_id, upload_file=file)
    return SourceResponse.model_validate(source)


@router.post(
    "/github",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest source code from GitHub repository"
)
async def ingest_github_source(
    project_id: str,
    payload: GitHubIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Validates GitHub URL (SSRF protected) and clones specified branch into project workspace."""
    await verify_project_ownership(project_id, db, current_user)
    provider = GitHubSourceProvider(db)
    source = await provider.acquire(
        project_id=project_id,
        repository_url=payload.repository_url,
        branch=payload.branch
    )
    return SourceResponse.model_validate(source)


@router.get(
    "",
    response_model=List[SourceResponse],
    status_code=status.HTTP_200_OK,
    summary="List all acquired sources for project"
)
async def list_project_sources(
    project_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves all source artifacts recorded for the given project."""
    await verify_project_ownership(project_id, db, current_user)
    source_repo = SourceRepository(db)
    sources = await source_repo.get_by_project(project_id, skip=skip, limit=limit)
    return [SourceResponse.model_validate(s) for s in sources]


@router.get(
    "/{source_id}",
    response_model=SourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get source details by ID"
)
async def get_source_by_id(
    project_id: str,
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves specific source metadata for a project."""
    await verify_project_ownership(project_id, db, current_user)
    source_repo = SourceRepository(db)
    source = await source_repo.get_by_id(source_id)
    if not source or source.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source artifact not found for this project"
        )
    return SourceResponse.model_validate(source)


@router.delete(
    "/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a source artifact"
)
async def delete_source(
    project_id: str,
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Deletes source record and removes source directory contents from project workspace."""
    await verify_project_ownership(project_id, db, current_user)
    source_repo = SourceRepository(db)
    source = await source_repo.get_by_id(source_id)
    if not source or source.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source artifact not found for this project"
        )
    await source_repo.delete(source)
    WorkspaceService.cleanup_source_dir(project_id)
