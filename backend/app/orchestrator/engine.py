import time
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scan import (
    Scan,
    ScanModule,
    ScanStatus,
    ModuleStatus,
    ModuleType,
    FindingSeverity,
)
from app.models.project import Project, RiskLevel
from app.models.analysis import ProjectAnalysis
from app.models.source import Source
from app.repositories.scan_repository import ScanRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.source_repository import SourceRepository
from app.repositories.analysis_repository import AnalysisRepository
from app.scanners.registry import SecurityModuleRegistry
from app.orchestrator.planner import ScanPlanner, ScanPlan
from app.services.workspace_service import WorkspaceService

logger = logging.getLogger("zentronyx.orchestrator.engine")


class ScanOrchestratorEngine:
    """
    Central Scan Orchestrator Engine.
    Executes scan plans asynchronously, enforces failure isolation, collects normalized findings,
    and maintains real-time scan & module state machine transitions.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.scan_repo = ScanRepository(db)
        self.project_repo = ProjectRepository(db)
        self.source_repo = SourceRepository(db)
        self.analysis_repo = AnalysisRepository(db)
        self.registry = SecurityModuleRegistry.get_instance()

    async def initiate_scan(
        self,
        project_id: str,
        requested_modules: Optional[List[ModuleType]] = None
    ) -> Scan:
        # 1. Prevent duplicate active scan for project
        active_scan = await self.scan_repo.get_active_scan_for_project(project_id)
        if active_scan:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate scan prevention: An active scan ({active_scan.id}) is already running for this project."
            )

        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # 2. Get latest READY source & latest ProjectAnalysis
        sources = await self.source_repo.get_by_project(project_id)
        ready_source: Optional[Source] = next((s for s in sources if s.acquisition_status == "READY"), None)

        analysis = await self.analysis_repo.get_latest_by_project(project_id)

        # 3. Generate Scan Execution Plan
        plan = ScanPlanner.generate_plan(analysis, requested_modules)

        # 4. Create Scan DB Record in CREATED state
        scan = await self.scan_repo.create_scan(
            project_id=project_id,
            source_id=ready_source.id if ready_source else None,
            analysis_id=analysis.id if analysis else None,
            source_fingerprint=plan.source_fingerprint
        )

        # 5. Create ScanModule entries for all plan modules
        module_db_map: Dict[ModuleType, ScanModule] = {}
        for mod_type in plan.selected_modules:
            if mod_type in plan.skipped_modules:
                sm = await self.scan_repo.create_scan_module(
                    scan_id=scan.id,
                    module_type=mod_type,
                    status=ModuleStatus.SKIPPED,
                    skip_reason=plan.skip_reasons.get(mod_type, "Module skipped by planner.")
                )
            else:
                sm = await self.scan_repo.create_scan_module(
                    scan_id=scan.id,
                    module_type=mod_type,
                    status=ModuleStatus.PENDING
                )
            module_db_map[mod_type] = sm

        # 6. Launch Async Orchestration in Background
        asyncio.create_task(
            self._execute_orchestrated_scan(
                scan_id=scan.id,
                project_id=project_id,
                ready_source=ready_source,
                analysis=analysis,
                plan=plan,
                module_db_map=module_db_map
            )
        )

        return scan

    async def _execute_orchestrated_scan(
        self,
        scan_id: str,
        project_id: str,
        ready_source: Optional[Source],
        analysis: Optional[ProjectAnalysis],
        plan: ScanPlan,
        module_db_map: Dict[ModuleType, ScanModule]
    ):
        from app.core.database import AsyncSessionLocal

        logger.info(f"Starting orchestration execution for Scan {scan_id}")
        async with AsyncSessionLocal() as bg_db:
            scan_repo = ScanRepository(bg_db)
            project_repo = ProjectRepository(bg_db)
            analysis_repo = AnalysisRepository(bg_db)

            scan = await scan_repo.get_by_id(scan_id)
            if not scan:
                return

            try:
                # Transition: QUEUED -> PREPARING -> RUNNING
                await scan_repo.update_scan_status(scan, ScanStatus.PREPARING)
                await scan_repo.update_scan_status(scan, ScanStatus.RUNNING)

                # Build context dict for scanners
                source_workspace = WorkspaceService.get_project_workspace_root(project_id) / "source"
                context: Dict[str, Any] = {
                    "scan_id": scan_id,
                    "project_id": project_id,
                    "source_path": source_workspace,
                    "primary_language": analysis.primary_language if analysis else "Unknown",
                    "detected_languages": analysis.detected_languages if analysis else [],
                    "framework": analysis.framework if analysis else "None",
                    "dependency_manifests": analysis.dependency_manifests if analysis else [],
                    "entry_points": analysis.entry_points if analysis else [],
                    "binary_type": analysis.binary_type if analysis else "NONE",
                }

                # Execute applicable modules concurrently with failure isolation
                tasks = []
                for mod_type in plan.applicable_modules:
                    scan_module = module_db_map[mod_type]
                    timeout = plan.timeouts.get(mod_type, 120)
                    tasks.append(
                        self._run_single_module_with_db(scan_id, scan_module.id, mod_type, context, timeout)
                    )

                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

                # Re-fetch scan object safely before updating status
                scan = await scan_repo.get_by_id(scan_id)
                if not scan:
                    return

                # Transition: RUNNING -> AGGREGATING
                await scan_repo.update_scan_status(scan, ScanStatus.AGGREGATING)

                # Aggregate Findings & Severity Summaries
                results = await scan_repo.get_scan_results(scan_id)
                total_findings = len(results)

                severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
                for r in results:
                    sev = r.severity.upper() if isinstance(r.severity, str) else r.severity.value
                    if sev in severity_counts:
                        severity_counts[sev] += 1

                # Risk score only uses actionable findings — exclude INFO
                risk_severity_counts = {k: v for k, v in severity_counts.items() if k != "INFO"}

                # Determine final scan state
                modules_list = await scan_repo.get_scan_modules(scan_id)
                has_failed_modules = any(m.status in (ModuleStatus.FAILED.value, ModuleStatus.TIMEOUT.value) for m in modules_list)

                final_status = ScanStatus.COMPLETED_WITH_ERRORS if has_failed_modules else ScanStatus.COMPLETED

                scan = await scan_repo.get_by_id(scan_id)
                if scan:
                    await scan_repo.update_scan_status(
                        scan=scan,
                        status=final_status,
                        severity_summary=severity_counts,
                        findings_count=total_findings
                    )

                # Update Project Risk Score (exclude INFO from risk calculation)
                await self._update_project_risk_with_db(bg_db, project_id, risk_severity_counts)

                logger.info(f"Scan {scan_id} finished with status {final_status.value}. Total findings: {total_findings}")

            except Exception as e:
                error_msg = f"Orchestrator fatal error: {str(e)}"
                logger.error(error_msg)
                try:
                    s = await scan_repo.get_by_id(scan_id)
                    if s:
                        await scan_repo.update_scan_status(s, ScanStatus.FAILED, error_message=error_msg)
                except Exception:
                    pass

    async def _run_single_module_with_db(
        self,
        scan_id: str,
        scan_module_id: str,
        mod_type: ModuleType,
        context: Dict[str, Any],
        timeout_seconds: int
    ):
        from app.core.database import AsyncSessionLocal

        start_time = time.time()
        module_impl = self.registry.get_module(mod_type)

        if not module_impl:
            try:
                async with AsyncSessionLocal() as db:
                    scan_repo = ScanRepository(db)
                    mod = await scan_repo.get_module_by_id(scan_module_id)
                    if mod:
                        await scan_repo.update_scan_module(
                            mod,
                            status=ModuleStatus.FAILED,
                            error_message=f"Module implementation not registered for {mod_type.value}"
                        )
            except Exception:
                pass
            return

        try:
            # Re-fetch module object safely in isolated session
            async with AsyncSessionLocal() as db:
                scan_repo = ScanRepository(db)
                mod = await scan_repo.get_module_by_id(scan_module_id)
                if mod:
                    await scan_repo.update_scan_module(mod, status=ModuleStatus.RUNNING)

            # Validate & Prepare
            if not await module_impl.validate(context) or not await module_impl.prepare(context):
                async with AsyncSessionLocal() as db:
                    scan_repo = ScanRepository(db)
                    mod = await scan_repo.get_module_by_id(scan_module_id)
                    if mod:
                        await scan_repo.update_scan_module(
                            mod,
                            status=ModuleStatus.FAILED,
                            error_message="Module validation or preparation check failed."
                        )
                return

            # Execute module with timeout protection
            findings = await asyncio.wait_for(module_impl.execute(context), timeout=timeout_seconds)
            exec_time_ms = int((time.time() - start_time) * 1000)

            # Save normalized findings to DB in isolated session
            async with AsyncSessionLocal() as db:
                scan_repo = ScanRepository(db)
                if findings:
                    await scan_repo.save_findings(scan_id, scan_module_id, mod_type, findings)

                mod = await scan_repo.get_module_by_id(scan_module_id)
                if mod:
                    await scan_repo.update_scan_module(
                        mod,
                        status=ModuleStatus.COMPLETED,
                        findings_count=len(findings),
                        execution_time_ms=exec_time_ms
                    )

        except asyncio.TimeoutError:
            exec_time_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"Module {mod_type.value} timed out after {timeout_seconds}s")
            try:
                async with AsyncSessionLocal() as db:
                    scan_repo = ScanRepository(db)
                    mod = await scan_repo.get_module_by_id(scan_module_id)
                    if mod:
                        await scan_repo.update_scan_module(
                            mod,
                            status=ModuleStatus.TIMEOUT,
                            execution_time_ms=exec_time_ms,
                            error_message=f"Module execution timed out after {timeout_seconds} seconds."
                        )
            except Exception:
                pass
        except Exception as e:
            exec_time_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Module {mod_type.value} execution error: {str(e)}")
            try:
                async with AsyncSessionLocal() as db:
                    scan_repo = ScanRepository(db)
                    mod = await scan_repo.get_module_by_id(scan_module_id)
                    if mod:
                        await scan_repo.update_scan_module(
                            mod,
                            status=ModuleStatus.FAILED,
                            execution_time_ms=exec_time_ms,
                            error_message=str(e)
                        )
            except Exception:
                pass
        finally:
            try:
                await module_impl.cleanup()
            except Exception:
                pass
            except Exception:
                pass

    async def _update_project_risk_with_db(self, db: AsyncSession, project_id: str, severity_counts: Dict[str, int]):
        project_repo = ProjectRepository(db)
        project = await project_repo.get_by_id(project_id)
        if not project:
            return

        from app.core.risk_engine import RiskEngine
        score, level, _ = RiskEngine.calculate_risk_score(severity_counts)
        project.risk_score = score
        project.risk_level = level
        await db.commit()

    async def _run_single_module(
        self,
        scan_id: str,
        scan_module: ScanModule,
        mod_type: ModuleType,
        context: Dict[str, Any],
        timeout_seconds: int
    ):
        start_time = time.time()
        module_impl = self.registry.get_module(mod_type)

        if not module_impl:
            try:
                mod = await self.scan_repo.get_module_by_id(scan_module.id)
                if mod:
                    await self.scan_repo.update_scan_module(
                        mod,
                        status=ModuleStatus.FAILED,
                        error_message=f"Module implementation not registered for {mod_type.value}"
                    )
            except Exception:
                pass
            return

        try:
            # Re-fetch module object safely
            mod = await self.scan_repo.get_module_by_id(scan_module.id)
            if mod:
                await self.scan_repo.update_scan_module(mod, status=ModuleStatus.RUNNING)

            # Validate & Prepare
            if not await module_impl.validate(context) or not await module_impl.prepare(context):
                mod = await self.scan_repo.get_module_by_id(scan_module.id)
                if mod:
                    await self.scan_repo.update_scan_module(
                        mod,
                        status=ModuleStatus.FAILED,
                        error_message="Module validation or preparation check failed."
                    )
                return

            # Execute module with timeout protection
            findings = await asyncio.wait_for(module_impl.execute(context), timeout=timeout_seconds)
            exec_time_ms = int((time.time() - start_time) * 1000)

            # Save normalized findings to DB
            if findings:
                await self.scan_repo.save_findings(scan_id, scan_module.id, mod_type, findings)

            mod = await self.scan_repo.get_module_by_id(scan_module.id)
            if mod:
                await self.scan_repo.update_scan_module(
                    mod,
                    status=ModuleStatus.COMPLETED,
                    findings_count=len(findings),
                    execution_time_ms=exec_time_ms
                )

        except asyncio.TimeoutError:
            exec_time_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"Module {mod_type.value} timed out after {timeout_seconds}s")
            try:
                mod = await self.scan_repo.get_module_by_id(scan_module.id)
                if mod:
                    await self.scan_repo.update_scan_module(
                        mod,
                        status=ModuleStatus.TIMEOUT,
                        execution_time_ms=exec_time_ms,
                        error_message=f"Module execution timed out after {timeout_seconds} seconds."
                    )
            except Exception:
                pass
        except Exception as e:
            exec_time_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Module {mod_type.value} execution error: {str(e)}")
            try:
                mod = await self.scan_repo.get_module_by_id(scan_module.id)
                if mod:
                    await self.scan_repo.update_scan_module(
                        mod,
                        status=ModuleStatus.FAILED,
                        execution_time_ms=exec_time_ms,
                        error_message=str(e)
                    )
            except Exception:
                pass
        finally:
            try:
                await module_impl.cleanup()
            except Exception:
                pass

    async def cancel_scan(self, scan_id: str) -> Scan:
        scan = await self.scan_repo.get_by_id(scan_id)
        if not scan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

        if scan.status in (ScanStatus.COMPLETED.value, ScanStatus.FAILED.value, ScanStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Scan cannot be cancelled because it is already in '{scan.status}' state."
            )

        # Update modules state
        modules = await self.scan_repo.get_scan_modules(scan_id)
        for mod in modules:
            if mod.status in (ModuleStatus.PENDING.value, ModuleStatus.QUEUED.value, ModuleStatus.RUNNING.value):
                await self.scan_repo.update_scan_module(mod, ModuleStatus.FAILED, error_message="Cancelled by user.")

        updated_scan = await self.scan_repo.update_scan_status(
            scan, ScanStatus.CANCELLED, error_message="Scan cancelled by user request."
        )
        return updated_scan

    async def _update_project_risk(self, project_id: str, severity_counts: Dict[str, int]):
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            return

        from app.core.risk_engine import RiskEngine
        score, level, _ = RiskEngine.calculate_risk_score(severity_counts)
        project.risk_score = score
        project.risk_level = level
        await self.db.commit()
