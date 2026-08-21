from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.source import Source, SourceType, AcquisitionStatus


VALID_TRANSITIONS = {
    AcquisitionStatus.PENDING: {AcquisitionStatus.VALIDATING, AcquisitionStatus.FAILED},
    AcquisitionStatus.VALIDATING: {AcquisitionStatus.ACQUIRING, AcquisitionStatus.EXTRACTING, AcquisitionStatus.FAILED},
    AcquisitionStatus.ACQUIRING: {AcquisitionStatus.READY, AcquisitionStatus.FAILED},
    AcquisitionStatus.EXTRACTING: {AcquisitionStatus.READY, AcquisitionStatus.FAILED},
    AcquisitionStatus.READY: {AcquisitionStatus.PENDING, AcquisitionStatus.VALIDATING, AcquisitionStatus.FAILED},
    AcquisitionStatus.FAILED: {AcquisitionStatus.PENDING, AcquisitionStatus.VALIDATING, AcquisitionStatus.ACQUIRING, AcquisitionStatus.EXTRACTING},
}


class SourceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, source_id: str) -> Optional[Source]:
        result = await self.db.execute(select(Source).where(Source.id == source_id))
        return result.scalar_one_or_none()

    async def get_by_project(self, project_id: str, skip: int = 0, limit: int = 100) -> List[Source]:
        result = await self.db.execute(
            select(Source)
            .where(Source.project_id == project_id)
            .order_by(Source.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(
        self,
        project_id: str,
        source_type: SourceType,
        source_url: Optional[str] = None,
        original_filename: Optional[str] = None,
        branch: Optional[str] = None,
        acquisition_status: AcquisitionStatus = AcquisitionStatus.PENDING
    ) -> Source:
        source = Source(
            project_id=project_id,
            source_type=source_type,
            source_url=source_url,
            original_filename=original_filename,
            branch=branch,
            acquisition_status=acquisition_status,
            file_size=0
        )
        self.db.add(source)
        await self.db.commit()
        await self.db.refresh(source)
        return source

    async def update_status(
        self,
        source: Source,
        new_status: AcquisitionStatus,
        error_message: Optional[str] = None
    ) -> Source:
        # Validate state transition
        allowed = VALID_TRANSITIONS.get(source.acquisition_status, set())
        if new_status not in allowed and source.acquisition_status != new_status:
            raise ValueError(
                f"Invalid source acquisition transition from {source.acquisition_status.value} to {new_status.value}"
            )

        source.acquisition_status = new_status
        if error_message:
            source.error_message = error_message
        await self.db.commit()
        await self.db.refresh(source)
        return source

    async def delete(self, source: Source) -> None:
        await self.db.delete(source)
        await self.db.commit()

