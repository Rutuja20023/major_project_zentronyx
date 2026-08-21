import os
import io
import zipfile
import pytest
from pathlib import Path
from httpx import AsyncClient
from app.services.workspace_service import WorkspaceService


def create_mock_zip(files: dict, include_symlink: bool = False) -> bytes:
    """Helper utility to generate in-memory ZIP bytes."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, content in files.items():
            zf.writestr(filename, content)
        if include_symlink:
            symlink_info = zipfile.ZipInfo("symlink_file.txt")
            symlink_info.create_system = 3  # Unix system
            symlink_info.external_attr = 0o120777 << 16  # Symlink attr
            zf.writestr(symlink_info, "target.txt")
    buf.seek(0)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_zip_upload_success(client: AsyncClient, auth_headers):
    # Create project
    proj_res = await client.post(
        "/api/v1/projects",
        json={"name": "ZIP Test Project"},
        headers=auth_headers
    )
    proj_id = proj_res.json()["id"]

    # Generate valid zip content
    zip_bytes = create_mock_zip({
        "main.py": "print('hello world')",
        "utils/helper.py": "def add(a, b): return a + b"
    })

    files = {"file": ("codebase.zip", zip_bytes, "application/zip")}
    upload_res = await client.post(
        f"/api/v1/projects/{proj_id}/sources/upload",
        files=files,
        headers=auth_headers
    )
    assert upload_res.status_code == 201
    source_data = upload_res.json()
    assert source_data["source_type"] == "ZIP"
    assert source_data["acquisition_status"] == "READY"
    assert source_data["source_fingerprint"] is not None

    # Workspace directory check
    workspace_source = WorkspaceService.get_project_workspace_root(proj_id) / "source"
    assert (workspace_source / "main.py").exists()
    assert (workspace_source / "utils" / "helper.py").exists()


@pytest.mark.asyncio
async def test_zip_invalid_extension(client: AsyncClient, auth_headers):
    proj_res = await client.post("/api/v1/projects", json={"name": "Invalid Ext"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    files = {"file": ("malicious.txt", b"not a zip", "text/plain")}
    upload_res = await client.post(
        f"/api/v1/projects/{proj_id}/sources/upload",
        files=files,
        headers=auth_headers
    )
    assert upload_res.status_code == 400
    assert "Invalid file format" in upload_res.json()["detail"]


@pytest.mark.asyncio
async def test_zip_slip_protection(client: AsyncClient, auth_headers):
    proj_res = await client.post("/api/v1/projects", json={"name": "Zip Slip Test"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # Create zip with malicious traversal path
    zip_bytes = create_mock_zip({
        "../outside.txt": "hacked payload",
        "../../etc/passwd": "root:x:0:0"
    })

    files = {"file": ("slip.zip", zip_bytes, "application/zip")}
    upload_res = await client.post(
        f"/api/v1/projects/{proj_id}/sources/upload",
        files=files,
        headers=auth_headers
    )
    assert upload_res.status_code == 400
    assert "Zip Slip" in upload_res.json()["detail"]


@pytest.mark.asyncio
async def test_zip_symlink_protection(client: AsyncClient, auth_headers):
    proj_res = await client.post("/api/v1/projects", json={"name": "Symlink Test"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    zip_bytes = create_mock_zip({"target.txt": "real content"}, include_symlink=True)

    files = {"file": ("symlink.zip", zip_bytes, "application/zip")}
    upload_res = await client.post(
        f"/api/v1/projects/{proj_id}/sources/upload",
        files=files,
        headers=auth_headers
    )
    assert upload_res.status_code == 201
    # Check that symlink file is not created or safely handled
    workspace_source = WorkspaceService.get_project_workspace_root(proj_id) / "source"
    assert (workspace_source / "target.txt").exists()


@pytest.mark.asyncio
async def test_github_invalid_url_ssrf(client: AsyncClient, auth_headers):
    proj_res = await client.post("/api/v1/projects", json={"name": "SSRF Test"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # Internal IP attack
    payload = {"repository_url": "http://127.0.0.1/owner/repo"}
    res = await client.post(f"/api/v1/projects/{proj_id}/sources/github", json=payload, headers=auth_headers)
    assert res.status_code in (400, 422)

    # Non-github host
    payload = {"repository_url": "https://malicious-site.com/owner/repo"}
    res = await client.post(f"/api/v1/projects/{proj_id}/sources/github", json=payload, headers=auth_headers)
    assert res.status_code in (400, 422)


@pytest.mark.asyncio
async def test_github_valid_and_delete_source(client: AsyncClient, auth_headers, monkeypatch):
    proj_res = await client.post("/api/v1/projects", json={"name": "GitHub Test"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # Mock subprocess for git clone
    class MockCompletedProcess:
        returncode = 0
        stdout = "a1b2c3d4e5f67890\n"
        stderr = ""

    def mock_run(cmd, **kwargs):
        return MockCompletedProcess()

    import subprocess
    monkeypatch.setattr(subprocess, "run", mock_run)

    payload = {
        "repository_url": "https://github.com/octocat/Hello-World",
        "branch": "main"
    }

    res = await client.post(f"/api/v1/projects/{proj_id}/sources/github", json=payload, headers=auth_headers)
    assert res.status_code == 201
    source = res.json()
    assert source["source_type"] == "GITHUB"
    assert source["acquisition_status"] == "READY"
    assert source["commit_hash"] == "a1b2c3d4e5f67890"

    # List sources
    list_res = await client.get(f"/api/v1/projects/{proj_id}/sources", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Delete source
    source_id = source["id"]
    del_res = await client.delete(f"/api/v1/projects/{proj_id}/sources/{source_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Verify sources list empty
    list_res_after = await client.get(f"/api/v1/projects/{proj_id}/sources", headers=auth_headers)
    assert len(list_res_after.json()) == 0


@pytest.mark.asyncio
async def test_source_ownership_isolation(client: AsyncClient, auth_headers, admin_auth_headers):
    # User 1 creates project
    proj_res = await client.post("/api/v1/projects", json={"name": "Owner Project"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    # Admin can list sources for project
    list_res = await client.get(f"/api/v1/projects/{proj_id}/sources", headers=admin_auth_headers)
    assert list_res.status_code == 200


@pytest.mark.asyncio
async def test_readonly_git_objects_cleanup(client: AsyncClient, auth_headers):
    proj_res = await client.post("/api/v1/projects", json={"name": "Readonly Git Test"}, headers=auth_headers)
    proj_id = proj_res.json()["id"]

    subdirs = WorkspaceService.initialize_project_workspace(proj_id)
    git_pack_dir = subdirs["source"] / ".git" / "objects" / "pack"
    git_pack_dir.mkdir(parents=True, exist_ok=True)
    idx_file = git_pack_dir / "pack-3132d1b9f08a0a01d65ace292fab847c17c0ba70.idx"
    idx_file.write_bytes(b"mock pack index data")

    # Mark file as read-only (mimicking git clone on Windows)
    import stat
    os.chmod(idx_file, stat.S_IREAD)

    # Calling cleanup_source_dir must delete read-only files without WinError 5
    WorkspaceService.cleanup_source_dir(proj_id)
    assert not subdirs["source"].exists() or not list(subdirs["source"].iterdir())

