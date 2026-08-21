from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.project import Project, RiskLevel
from app.models.policy import PolicyEvaluation
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, project_id: str) -> Optional[Project]:
        result = await self.db.execute(select(Project).where(Project.id == project_id))
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_id: str, skip: int = 0, limit: int = 100) -> List[Project]:
        result = await self.db.execute(
            select(Project)
            .where(Project.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, project_in: ProjectCreate, owner_id: str) -> Project:
        project = Project(
            name=project_in.name,
            description=project_in.description,
            repository_url=project_in.repository_url,
            owner_id=owner_id,
            risk_score=0.0,
            risk_level=RiskLevel.UNKNOWN,
            status="active"
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Project]:
        result = await self.db.execute(select(Project).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def update(self, project: Project, project_in: ProjectUpdate) -> Project:
        if project_in.name is not None:
            project.name = project_in.name
        if project_in.description is not None:
            project.description = project_in.description
        if project_in.repository_url is not None:
            project.repository_url = project_in.repository_url
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete(self, project: Project) -> None:
        await self.db.execute(delete(PolicyEvaluation).where(PolicyEvaluation.project_id == project.id))
        await self.db.delete(project)
        await self.db.commit()

