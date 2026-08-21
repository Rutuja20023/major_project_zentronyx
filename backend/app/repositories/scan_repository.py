from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.scan import (
    Scan,
    ScanModule,
    ScanResult,
    ScanStatus,
    ModuleStatus,
    ModuleType,
    FindingSeverity,
    FindingConfidence,
)
from app.scanners.base import FindingData


class ScanRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, scan_id: str) -> Optional[Scan]:
        result = await self.db.execute(select(Scan).where(Scan.id == scan_id))
        return result.scalar_one_or_none()

    async def list_by_project(self, project_id: str, skip: int = 0, limit: int = 100) -> List[Scan]:
        result = await self.db.execute(
            select(Scan)
            .where(Scan.project_id == project_id)
            .order_by(Scan.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_active_scan_for_project(self, project_id: str) -> Optional[Scan]:
        active_statuses = [
            ScanStatus.QUEUED.value,
            ScanStatus.PREPARING.value,
            ScanStatus.RUNNING.value,
            ScanStatus.AGGREGATING.value,
        ]
        result = await self.db.execute(
            select(Scan)
            .where(and_(Scan.project_id == project_id, Scan.status.in_(active_statuses)))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_scan(
        self,
        project_id: str,
        source_id: Optional[str] = None,
        analysis_id: Optional[str] = None,
        source_fingerprint: Optional[str] = None
    ) -> Scan:
        scan = Scan(
            project_id=project_id,
            source_id=source_id,
            analysis_id=analysis_id,
            source_fingerprint=source_fingerprint,
            status=ScanStatus.CREATED.value,
            findings_count=0,
            severity_summary={"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        )
        self.db.add(scan)
        await self.db.commit()
        await self.db.refresh(scan)
        return scan

    async def update_scan_status(
        self,
        scan: Scan,
        status: ScanStatus,
        severity_summary: Optional[Dict[str, int]] = None,
        findings_count: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Scan:
        scan.status = status.value
        if severity_summary is not None:
            scan.severity_summary = severity_summary
        if findings_count is not None:
            scan.findings_count = findings_count
        if error_message:
            scan.error_message = error_message
        if status in (ScanStatus.RUNNING, ScanStatus.PREPARING) and not scan.started_at:
            scan.started_at = datetime.now(timezone.utc)
        if status in (ScanStatus.COMPLETED, ScanStatus.COMPLETED_WITH_ERRORS, ScanStatus.FAILED, ScanStatus.CANCELLED, ScanStatus.TIMEOUT):
            scan.finished_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(scan)
        return scan

    async def create_scan_module(
        self,
        scan_id: str,
        module_type: ModuleType,
        status: ModuleStatus = ModuleStatus.PENDING,
        skip_reason: Optional[str] = None
    ) -> ScanModule:
        scan_module = ScanModule(
            scan_id=scan_id,
            module_type=module_type.value,
            status=status.value,
            skip_reason=skip_reason,
            findings_count=0
        )
        self.db.add(scan_module)
        await self.db.commit()
        await self.db.refresh(scan_module)
        return scan_module

    async def update_scan_module(
        self,
        scan_module: ScanModule,
        status: ModuleStatus,
        findings_count: int = 0,
        execution_time_ms: int = 0,
        error_message: Optional[str] = None
    ) -> ScanModule:
        scan_module.status = status.value
        scan_module.findings_count = findings_count
        scan_module.execution_time_ms = execution_time_ms
        if error_message:
            scan_module.error_message = error_message

        if status == ModuleStatus.RUNNING and not scan_module.started_at:
            scan_module.started_at = datetime.now(timezone.utc)
        if status in (ModuleStatus.COMPLETED, ModuleStatus.FAILED, ModuleStatus.TIMEOUT, ModuleStatus.SKIPPED):
            scan_module.finished_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(scan_module)
        return scan_module

    async def save_findings(
        self,
        scan_id: str,
        scan_module_id: Optional[str],
        module_type: ModuleType,
        findings: List[FindingData]
    ) -> List[ScanResult]:
        db_results: List[ScanResult] = []
        for f in findings:
            res = ScanResult(
                scan_id=scan_id,
                scan_module_id=scan_module_id,
                module_type=module_type.value,
                title=f.title,
                description=f.description,
                severity=f.severity.value,
                confidence=f.confidence.value,
                category=f.category,
                file=f.file,
                line=f.line,
                column=f.column,
                scanner=f.scanner,
                rule_id=f.rule_id,
                recommendation=f.recommendation,
                raw_metadata=f.raw_metadata
            )
            self.db.add(res)
            db_results.append(res)

        await self.db.commit()
        return db_results

    async def get_scan_modules(self, scan_id: str) -> List[ScanModule]:
        result = await self.db.execute(
            select(ScanModule).where(ScanModule.scan_id == scan_id)
        )
        return list(result.scalars().all())

    async def get_scan_results(
        self,
        scan_id: str,
        severity: Optional[str] = None,
        module_type: Optional[str] = None
    ) -> List[ScanResult]:
        query = select(ScanResult).where(ScanResult.scan_id == scan_id)
        if severity:
            query = query.where(ScanResult.severity == severity.upper())
        if module_type:
            query = query.where(ScanResult.module_type == module_type.upper())

        result = await self.db.execute(query.order_by(ScanResult.created_at.asc()))
        return list(result.scalars().all())
