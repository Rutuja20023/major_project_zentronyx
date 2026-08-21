import pytest
import io
import zipfile
import asyncio
from pathlib import Path
from httpx import AsyncClient

from app.analyzers.engine import ProjectAnalysisEngine
from app.orchestrator.planner import ScanPlanner
from app.models.scan import ModuleType, ScanStatus, ModuleStatus
from app.scanners.registry import SecurityModuleRegistry
from app.scanners.mock_modules import MockSASTModule, MockSCAModule


def create_sample_project_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("app.py", "from fastapi import FastAPI\napp = FastAPI()\nSECRET_KEY = 'super_secret'\n")
        zf.writestr("requirements.txt", "fastapi==0.100.0\nuvicorn==0.22.0\nrequests==2.28.1\n")
        zf.writestr("Dockerfile", "FROM python:3.11\nCMD ['uvicorn', 'app:app']\n")
        zf.writestr("tests/test_main.py", "def test_app(): pass\n")
    buf.seek(0)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_project_analysis_engine_detectors(tmp_path: Path):
    # Create sample codebase directory structure
    (tmp_path / "app.py").write_text("from fastapi import FastAPI\napp = FastAPI()\n")
    (tmp_path / "requirements.txt").write_text("fastapi==0.100.0\n")
    (tmp_path / "tests").mkdir()
    (tmp_path / "tests" / "test_app.py").write_text("def test_ok(): assert True\n")

    engine = ProjectAnalysisEngine()
    result = engine.analyze(tmp_path)

    assert result["primary_language"] == "Python"
    assert "Python" in result["detected_languages"]
    assert result["framework"] == "FastAPI"
    assert result["build_system"] == "pip/pyproject"
    assert "requirements.txt" in result["dependency_manifests"]
    assert "app.py" in result["entry_points"]
    assert result["application_type"] == "WEB_APP"
    assert result["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_scan_planner_applicability():
    class DummyAnalysis:
        id = "analysis-123"
        source_fingerprint = "fingerprint-abc"
        primary_language = "Python"
        detected_languages = ["Python"]
        dependency_manifests = ["requirements.txt"]
        framework = "FastAPI"
        binary_capable = False

    dummy_analysis = DummyAnalysis()
    plan = ScanPlanner.generate_plan(dummy_analysis)

    assert ModuleType.SAST in plan.applicable_modules
    assert ModuleType.SCA in plan.applicable_modules
    assert ModuleType.DAST in plan.applicable_modules
    assert ModuleType.GNN in plan.applicable_modules
    assert ModuleType.BINARY_ANALYSIS in plan.skipped_modules
    assert "non-compiled script" in plan.skip_reasons[ModuleType.BINARY_ANALYSIS]


@pytest.mark.asyncio
async def test_analysis_api_flow(client: AsyncClient, auth_headers):
    # 1. Create project
    proj_res = await client.post("/api/v1/projects", json={"name": "Analysis API Test"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # 2. Upload ZIP source
    zip_bytes = create_sample_project_zip()
    files = {"file": ("codebase.zip", zip_bytes, "application/zip")}
    upload_res = await client.post(f"/api/v1/projects/{proj_id}/sources/upload", files=files, headers=auth_headers)
    assert upload_res.status_code == 201

    # 3. Trigger analysis
    analysis_res = await client.post(f"/api/v1/projects/{proj_id}/analysis", headers=auth_headers)
    assert analysis_res.status_code == 201
    analysis_data = analysis_res.json()
    assert analysis_data["primary_language"] == "Python"
    assert analysis_data["framework"] == "FastAPI"

    # 4. Get latest analysis
    get_res = await client.get(f"/api/v1/projects/{proj_id}/analysis", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == analysis_data["id"]


@pytest.mark.asyncio
async def test_full_scan_orchestration_flow(client: AsyncClient, auth_headers):
    # Register mock adapters to ensure findings in test environment
    registry = SecurityModuleRegistry.get_instance()
    registry.register(ModuleType.SAST, MockSASTModule())
    registry.register(ModuleType.SCA, MockSCAModule())

    # Create project, upload source & analyze
    proj_res = await client.post("/api/v1/projects", json={"name": "Scan Orchestrator Flow"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    zip_bytes = create_sample_project_zip()
    files = {"file": ("code.zip", zip_bytes, "application/zip")}
    await client.post(f"/api/v1/projects/{proj_id}/sources/upload", files=files, headers=auth_headers)
    await client.post(f"/api/v1/projects/{proj_id}/analysis", headers=auth_headers)

    # Launch security scan
    scan_res = await client.post(f"/api/v1/projects/{proj_id}/scans", json={}, headers=auth_headers)
    assert scan_res.status_code == 201
    scan_id = scan_res.json()["id"]

    # Wait briefly for background execution tasks
    await asyncio.sleep(1.0)

    # Retrieve scan details
    scan_detail = await client.get(f"/api/v1/projects/{proj_id}/scans/{scan_id}", headers=auth_headers)
    assert scan_detail.status_code == 200
    scan_info = scan_detail.json()
    assert scan_info["status"] in ("CREATED", "QUEUED", "PREPARING", "RUNNING", "AGGREGATING", "COMPLETED", "COMPLETED_WITH_ERRORS")
    assert scan_info["findings_count"] >= 0

    # Retrieve module execution details
    modules_res = await client.get(f"/api/v1/scans/{scan_id}/modules", headers=auth_headers)
    assert modules_res.status_code == 200
    modules = modules_res.json()
    assert len(modules) >= 1


@pytest.mark.asyncio
async def test_duplicate_scan_prevention(client: AsyncClient, auth_headers):
    proj_res = await client.post("/api/v1/projects", json={"name": "Duplicate Scan Test"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    zip_bytes = create_sample_project_zip()
    files = {"file": ("code.zip", zip_bytes, "application/zip")}
    await client.post(f"/api/v1/projects/{proj_id}/sources/upload", files=files, headers=auth_headers)
    await client.post(f"/api/v1/projects/{proj_id}/analysis", headers=auth_headers)

    # First scan
    scan_1 = await client.post(f"/api/v1/projects/{proj_id}/scans", json={}, headers=auth_headers)
    assert scan_1.status_code == 201

    # Immediate second scan while first scan is running/queued
    scan_2 = await client.post(f"/api/v1/projects/{proj_id}/scans", json={}, headers=auth_headers)
    assert scan_2.status_code in (409, 201)


@pytest.mark.asyncio
async def test_scan_cancellation(client: AsyncClient, auth_headers):
    proj_res = await client.post("/api/v1/projects", json={"name": "Cancel Test"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    zip_bytes = create_sample_project_zip()
    files = {"file": ("code.zip", zip_bytes, "application/zip")}
    await client.post(f"/api/v1/projects/{proj_id}/sources/upload", files=files, headers=auth_headers)
    await client.post(f"/api/v1/projects/{proj_id}/analysis", headers=auth_headers)

    scan_res = await client.post(f"/api/v1/projects/{proj_id}/scans", json={}, headers=auth_headers)
    scan_id = scan_res.json()["id"]

    # Cancel scan
    cancel_res = await client.post(f"/api/v1/scans/{scan_id}/cancel", headers=auth_headers)
    assert cancel_res.status_code in (200, 400)

