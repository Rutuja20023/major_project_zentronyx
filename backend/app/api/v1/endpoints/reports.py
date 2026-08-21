from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.security.dependencies import get_current_active_user
from app.repositories.scan_repository import ScanRepository
from app.services.report_service import ReportService

router = APIRouter(prefix="/scans/{scan_id}/report", tags=["Unified Reports"])


@router.get("", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def get_json_report(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    report_service = ReportService(db)
    return await report_service.generate_json_report(scan_id)


@router.get("/pdf", status_code=status.HTTP_200_OK)
async def download_pdf_report(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    report_service = ReportService(db)
    pdf_bytes = await report_service.generate_pdf_report(scan_id)

    headers = {
        "Content-Disposition": f"attachment; filename=zentronyx_security_report_{scan_id[:8]}.pdf",
        "Content-Type": "application/pdf"
    }

    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get("/html", status_code=status.HTTP_200_OK)
async def download_html_report(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    report_service = ReportService(db)
    html_content = await report_service.generate_html_report(scan_id)

    headers = {
        "Content-Disposition": f"inline; filename=zentronyx_report_{scan_id[:8]}.html",
        "Content-Type": "text/html; charset=utf-8"
    }

    return Response(content=html_content.encode("utf-8"), media_type="text/html", headers=headers)


@router.get("/csv", status_code=status.HTTP_200_OK)
async def download_csv_report(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    report_service = ReportService(db)
    csv_content = await report_service.generate_csv_report(scan_id)

    headers = {
        "Content-Disposition": f"attachment; filename=zentronyx_findings_{scan_id[:8]}.csv",
        "Content-Type": "text/csv; charset=utf-8"
    }

    return Response(content=csv_content.encode("utf-8"), media_type="text/csv", headers=headers)
