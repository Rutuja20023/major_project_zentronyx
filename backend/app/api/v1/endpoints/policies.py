from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.policy import SecurityPolicy, PolicyEvaluation, PolicyDecision
from app.security.dependencies import get_current_active_user
from app.repositories.scan_repository import ScanRepository
from app.core.policy_engine import PolicyEngine

router = APIRouter(prefix="/policies", tags=["Security Policy Engine"])


class PolicyCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False
    max_critical_findings: int = Field(default=0, ge=0)
    max_high_findings: int = Field(default=3, ge=0)
    max_malware_probability: float = Field(default=0.70, ge=0.0, le=1.0)
    block_on_dast_critical: bool = True
    block_on_critical_sca: bool = True


@router.get("", response_model=List[Dict[str, Any]], status_code=status.HTTP_200_OK)
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stmt = select(SecurityPolicy).order_by(SecurityPolicy.created_at.desc())
    res = await db.execute(stmt)
    policies = res.scalars().all()

    if not policies:
        # Create default policy
        default_p = SecurityPolicy(
            name="Zentronyx Strict Defense Baseline",
            description="Default security policy blocking CI/CD pipelines on Critical vulnerabilities or high malware probability.",
            is_default=True,
            max_critical_findings=0,
            max_high_findings=3,
            max_malware_probability=0.70,
            block_on_dast_critical=True,
            block_on_critical_sca=True
        )
        db.add(default_p)
        await db.commit()
        await db.refresh(default_p)
        policies = [default_p]

    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "is_default": p.is_default,
            "max_critical_findings": p.max_critical_findings,
            "max_high_findings": p.max_high_findings,
            "max_malware_probability": p.max_malware_probability,
            "block_on_dast_critical": p.block_on_dast_critical,
            "block_on_critical_sca": p.block_on_critical_sca,
        }
        for p in policies
    ]


@router.post("/scans/{scan_id}/evaluate", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def evaluate_scan_policy(
    scan_id: str,
    policy_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    results = await scan_repo.get_scan_results(scan_id)

    # Fetch policy if policy_id provided
    policy_obj = None
    if policy_id:
        stmt = select(SecurityPolicy).where(SecurityPolicy.id == policy_id)
        res = await db.execute(stmt)
        policy_obj = res.scalar_one_or_none()

    severity_summary = scan.severity_summary or {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}

    malware_prob = 0.0
    dast_crit = 0
    sca_crit = 0

    for r in results:
        if r.module_type == "GNN" and r.raw_metadata:
            malware_prob = float(r.raw_metadata.get("malware_probability", 0.0))
        if r.module_type == "DAST" and r.severity == "CRITICAL":
            dast_crit += 1
        if r.module_type == "SCA" and r.severity == "CRITICAL":
            sca_crit += 1

    decision, reasons, violations = PolicyEngine.evaluate(
        severity_summary=severity_summary,
        malware_probability=malware_prob,
        dast_critical_count=dast_crit,
        sca_critical_count=sca_crit,
        policy=policy_obj
    )

    evaluation = PolicyEvaluation(
        scan_id=scan.id,
        project_id=scan.project_id,
        policy_id=policy_obj.id if policy_obj else None,
        decision=decision,
        reasons=reasons,
        rule_violations=violations
    )
    db.add(evaluation)
    await db.commit()

    return {
        "scan_id": scan.id,
        "project_id": scan.project_id,
        "decision": decision.value,
        "reasons": reasons,
        "rule_violations": violations
    }
