from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.security.dependencies import get_current_active_user
from app.repositories.project_repository import ProjectRepository
from app.repositories.source_repository import SourceRepository
from app.repositories.analysis_repository import AnalysisRepository
from app.analyzers.engine import ProjectAnalysisEngine
from app.schemas.analysis import ProjectAnalysisResponse
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/projects/{project_id}/analysis", tags=["Project Analysis"])


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
    "",
    response_model=ProjectAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze project source code without executing it"
)
async def analyze_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Executes read-only Project Analysis Engine to detect languages, frameworks, build systems, and stats."""
    await verify_project_ownership(project_id, db, current_user)

    # Check source
    source_repo = SourceRepository(db)
    sources = await source_repo.get_by_project(project_id)
    ready_source = next((s for s in sources if s.acquisition_status == "READY"), None)

    source_dir = WorkspaceService.get_project_workspace_root(project_id) / "source"
    if not source_dir.exists() or not any(source_dir.iterdir()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No acquired source code found in workspace. Please upload a ZIP archive or clone a repository first."
        )

    # Run Analysis Engine
    engine = ProjectAnalysisEngine()
    analysis_data = engine.analyze(source_dir)

    # Save to DB
    analysis_repo = AnalysisRepository(db)
    analysis = await analysis_repo.create(
        project_id=project_id,
        source_id=ready_source.id if ready_source else None,
        source_fingerprint=ready_source.source_fingerprint if ready_source else None,
        analysis_data=analysis_data
    )

    return ProjectAnalysisResponse.model_validate(analysis)


@router.get(
    "",
    response_model=ProjectAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Get latest project analysis"
)
async def get_project_analysis(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves the most recent analysis results for the project."""
    await verify_project_ownership(project_id, db, current_user)

    analysis_repo = AnalysisRepository(db)
    analysis = await analysis_repo.get_latest_by_project(project_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis results found for this project. Trigger analysis first."
        )

    return ProjectAnalysisResponse.model_validate(analysis)
