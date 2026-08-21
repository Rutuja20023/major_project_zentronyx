import pytest
import asyncio
from pathlib import Path
from app.scanners.semgrep_sast import SemgrepSASTModule
from app.scanners.osv_sca import OSVScannerSCAModule
from app.scanners.owasp_zap_dast import OWASPZAPDASTModule
from app.models.scan import FindingSeverity


@pytest.mark.asyncio
async def test_semgrep_sast_module_execution(tmp_path: Path):
    (tmp_path / "app.py").write_text("import sqlite3\nAPI_KEY = 'secret_token_1234567890abcdef'\nconn = sqlite3.connect(':memory:')\n")
    module = SemgrepSASTModule()

    context = {
        "source_path": str(tmp_path),
        "primary_language": "Python",
        "entry_points": ["app.py"]
    }

    assert await module.validate(context) is True
    findings = await module.execute(context)
    assert len(findings) > 0
    assert findings[0].scanner == "Semgrep SAST Engine"
    assert findings[0].severity in (FindingSeverity.HIGH, FindingSeverity.MEDIUM, FindingSeverity.CRITICAL)


@pytest.mark.asyncio
async def test_osv_sca_module_execution(tmp_path: Path):
    (tmp_path / "requirements.txt").write_text("requests==2.25.0\n")
    module = OSVScannerSCAModule()

    context = {
        "source_path": str(tmp_path),
        "dependency_manifests": ["requirements.txt"]
    }

    assert await module.validate(context) is True
    findings = await module.execute(context)
    assert len(findings) > 0
    assert "SCA" in findings[0].category or "PyPI" in findings[0].category
    assert findings[0].scanner == "OSV-Scanner SCA Engine"


@pytest.mark.asyncio
async def test_dast_ssrf_protection():
    module = OWASPZAPDASTModule()

    # Valid targets
    assert module.validate_dast_target("http://127.0.0.1:8000/health") == "http://127.0.0.1:8000/health"
    assert module.validate_dast_target("http://localhost:3000") == "http://localhost:3000"

    # Forbidden external targets
    with pytest.raises(ValueError, match="DAST SSRF Guard"):
        module.validate_dast_target("https://google.com")

    with pytest.raises(ValueError, match="DAST SSRF Guard"):
        module.validate_dast_target("http://8.8.8.8")
