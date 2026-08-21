import pytest
import io
import zipfile
from httpx import AsyncClient


def create_dummy_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("main.py", "import os\nos.system('ls')\nSECRET_KEY='hardcoded_secret_token'\n")
        zf.writestr("requirements.txt", "requests==2.20.0\nflask==1.0.0\n")
    buf.seek(0)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_full_report_generation_suite(client: AsyncClient, auth_headers: dict):
    # 1. Create a project
    proj_res = await client.post(
        "/api/v1/projects",
        json={"name": "Report Test Corp", "description": "Enterprise security report testing"},
        headers=auth_headers
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 2. Upload source zip
    zip_bytes = create_dummy_zip()
    upload_res = await client.post(
        f"/api/v1/projects/{project_id}/sources/upload",
        files={"file": ("project.zip", zip_bytes, "application/zip")},
        headers=auth_headers
    )
    assert upload_res.status_code == 201

    # 3. Trigger analysis
    analysis_res = await client.post(
        f"/api/v1/projects/{project_id}/analysis",
        headers=auth_headers
    )
    assert analysis_res.status_code == 201

    # 4. Trigger Scan
    scan_res = await client.post(
        f"/api/v1/projects/{project_id}/scans",
        json={"selected_modules": ["SAST", "SCA", "GNN"]},
        headers=auth_headers
    )
    assert scan_res.status_code == 201
    scan_id = scan_res.json()["id"]

    # 5. Test JSON Report endpoint
    rep_json_res = await client.get(f"/api/v1/scans/{scan_id}/report", headers=auth_headers)
    assert rep_json_res.status_code == 200
    report_data = rep_json_res.json()

    assert "report_id" in report_data
    assert "project" in report_data
    assert report_data["project"]["name"] == "Report Test Corp"
    assert "executive_summary" in report_data
    assert "compliance_matrix" in report_data
    assert "owasp_top_10" in report_data["compliance_matrix"]
    assert "nist_sp_800_53" in report_data["compliance_matrix"]
    assert "iso_27001" in report_data["compliance_matrix"]
    assert "soc_2" in report_data["compliance_matrix"]
    assert "findings" in report_data
    assert "attestation" in report_data
    assert len(report_data["attestation"]["audit_hash"]) == 64

    # 6. Test PDF Report endpoint
    rep_pdf_res = await client.get(f"/api/v1/scans/{scan_id}/report/pdf", headers=auth_headers)
    assert rep_pdf_res.status_code == 200
    assert rep_pdf_res.headers.get("content-type") == "application/pdf"
    assert rep_pdf_res.content.startswith(b"%PDF-")  # Valid PDF binary signature!

    # 7. Test HTML Report endpoint
    rep_html_res = await client.get(f"/api/v1/scans/{scan_id}/report/html", headers=auth_headers)
    assert rep_html_res.status_code == 200
    assert "text/html" in rep_html_res.headers.get("content-type", "")
    assert "ZENTRONYX SECURITY INTELLIGENCE REPORT" in rep_html_res.text
    assert "Report Test Corp" in rep_html_res.text

    # 8. Test CSV Report endpoint
    rep_csv_res = await client.get(f"/api/v1/scans/{scan_id}/report/csv", headers=auth_headers)
    assert rep_csv_res.status_code == 200
    assert "text/csv" in rep_csv_res.headers.get("content-type", "")
    assert "Finding ID,Severity,Title" in rep_csv_res.text
