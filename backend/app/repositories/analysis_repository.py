from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.analysis import ProjectAnalysis, AnalysisStatus


class AnalysisRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, analysis_id: str) -> Optional[ProjectAnalysis]:
        result = await self.db.execute(
            select(ProjectAnalysis).where(ProjectAnalysis.id == analysis_id)
        )
        return result.scalar_one_or_none()

    async def get_latest_by_project(self, project_id: str) -> Optional[ProjectAnalysis]:
        result = await self.db.execute(
            select(ProjectAnalysis)
            .where(ProjectAnalysis.project_id == project_id)
            .order_by(ProjectAnalysis.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        project_id: str,
        source_id: Optional[str],
        source_fingerprint: Optional[str],
        analysis_data: Dict[str, Any]
    ) -> ProjectAnalysis:
        analysis = ProjectAnalysis(
            project_id=project_id,
            source_id=source_id,
            source_fingerprint=source_fingerprint,
            primary_language=analysis_data.get("primary_language"),
            detected_languages=analysis_data.get("detected_languages"),
            language_statistics=analysis_data.get("language_statistics"),
            framework=analysis_data.get("framework"),
            framework_version=analysis_data.get("framework_version"),
            build_system=analysis_data.get("build_system"),
            dependency_manifests=analysis_data.get("dependency_manifests"),
            entry_points=analysis_data.get("entry_points"),
            application_type=analysis_data.get("application_type"),
            binary_capable=analysis_data.get("binary_capable", False),
            binary_type=analysis_data.get("binary_type"),
            statistics=analysis_data.get("statistics"),
            warnings=analysis_data.get("warnings"),
            confidence=analysis_data.get("confidence", 1.0),
            status=analysis_data.get("status", AnalysisStatus.COMPLETED.value)
        )
        self.db.add(analysis)
        await self.db.commit()
        await self.db.refresh(analysis)
        return analysis
