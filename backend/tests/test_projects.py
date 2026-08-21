import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_projects(client: AsyncClient, auth_headers):
    # 1. Create Project
    create_payload = {
        "name": "E-Commerce Microservices Platform",
        "description": "Payment and Inventory services code security scan",
        "repository_url": "https://github.com/zentronyx/e-commerce-backend"
    }
    create_res = await client.post("/api/v1/projects", json=create_payload, headers=auth_headers)
    assert create_res.status_code == 201
    proj = create_res.json()
    assert proj["name"] == create_payload["name"]
    assert proj["risk_level"] == "UNKNOWN"

    # 2. List Projects
    list_res = await client.get("/api/v1/projects", headers=auth_headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert len(projects) == 1
    assert projects[0]["id"] == proj["id"]


@pytest.mark.asyncio
async def test_project_ownership_isolation(client: AsyncClient, auth_headers, admin_auth_headers):
    # User 1 creates project
    create_res = await client.post(
        "/api/v1/projects",
        json={"name": "Isolated Project", "description": "Owner check"},
        headers=auth_headers
    )
    proj_id = create_res.json()["id"]

    # Admin can view it
    admin_get = await client.get(f"/api/v1/projects/{proj_id}", headers=admin_auth_headers)
    assert admin_get.status_code == 200


@pytest.mark.asyncio
async def test_update_and_delete_project(client: AsyncClient, auth_headers):
    # 1. Create project
    create_res = await client.post(
        "/api/v1/projects",
        json={"name": "Initial Name", "description": "Desc"},
        headers=auth_headers
    )
    proj_id = create_res.json()["id"]

    # 2. Update project
    update_res = await client.put(
        f"/api/v1/projects/{proj_id}",
        json={"name": "Updated Name", "description": "New Desc"},
        headers=auth_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Name"

    # 3. Delete project
    del_res = await client.delete(f"/api/v1/projects/{proj_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # 4. Verify project is gone
    get_res = await client.get(f"/api/v1/projects/{proj_id}", headers=auth_headers)
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_cascade_delete_project_with_full_data(client: AsyncClient, auth_headers):
    import io
    import zipfile

    # 1. Create project
    create_res = await client.post(
        "/api/v1/projects",
        json={"name": "Cascade Delete Test Project", "description": "Full cascade test"},
        headers=auth_headers
    )
    proj_id = create_res.json()["id"]

    # 2. Upload source zip
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("app.py", "print('hello world')\n")
    buf.seek(0)
    files = {"file": ("code.zip", buf.getvalue(), "application/zip")}
    await client.post(f"/api/v1/projects/{proj_id}/sources/upload", files=files, headers=auth_headers)

    # 3. Trigger analysis
    await client.post(f"/api/v1/projects/{proj_id}/analysis", headers=auth_headers)

    # 4. Launch scan
    scan_res = await client.post(f"/api/v1/projects/{proj_id}/scans", json={}, headers=auth_headers)
    assert scan_res.status_code == 201

    # 5. Delete project (should cleanly cascade delete all sources, analyses, scans, modules, results, and evaluations)
    del_res = await client.delete(f"/api/v1/projects/{proj_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # 6. Verify project is completely gone
    get_res = await client.get(f"/api/v1/projects/{proj_id}", headers=auth_headers)
    assert get_res.status_code == 404


