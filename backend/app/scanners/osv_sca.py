import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.process_executor import ProcessExecutor
from app.models.scan import ModuleType, FindingSeverity, FindingConfidence
from app.scanners.base import SecurityModule, FindingData

logger = logging.getLogger("zentronyx.scanners.sca.osv")


class OSVScannerSCAModule(SecurityModule):
    """
    Production-grade SCA scanner adapter integrating OSV-Scanner.
    Scans dependency manifests identified during analysis without executing package managers.
    Parses OSV-Scanner JSON findings into normalized Zentronyx schema.
    """

    def __init__(self):
        self.version = self._get_osv_version()

    def _get_osv_version(self) -> str:
        res = ProcessExecutor.run_command([settings.OSV_SCANNER_BIN, "--version"], timeout_seconds=5)
        if res.exit_code == 0 and res.stdout.strip():
            return res.stdout.strip()
        return "1.8.2-osv-scanner"

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "OSV-Scanner Software Composition Analysis",
            "module_type": ModuleType.SCA,
            "version": self.version,
            "description": "Scans lockfiles and dependency manifests against Open Source Vulnerability (OSV) database.",
            "osv_version": self.version,
        }

    async def validate(self, context: Dict[str, Any]) -> bool:
        source_path = context.get("source_path")
        if not source_path or not Path(source_path).exists():
            return False
        manifests = context.get("dependency_manifests", [])
        return len(manifests) > 0 or True

    async def prepare(self, context: Dict[str, Any]) -> bool:
        return True

    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        source_path = Path(context.get("source_path")).resolve()
        manifests = context.get("dependency_manifests", [])

        logger.info(f"Executing OSV-Scanner SCA on workspace: {source_path}")

        cmd = [
            settings.OSV_SCANNER_BIN,
            "--json",
            "-r",
            str(source_path)
        ]

        res = ProcessExecutor.run_command(cmd, cwd=str(source_path), timeout_seconds=settings.OSV_SCANNER_TIMEOUT)

        findings: List[FindingData] = []

        if res.stdout and res.stdout.strip().startswith("{"):
            try:
                data = json.loads(res.stdout)
                results = data.get("results", [])
                for res_item in results:
                    packages = res_item.get("packages", [])
                    rel_manifest = res_item.get("source", {}).get("path", "")
                    try:
                        if rel_manifest and str(source_path) in rel_manifest:
                            rel_manifest = str(Path(rel_manifest).relative_to(source_path))
                    except Exception:
                        pass

                    for pkg in packages:
                        vulnerabilities = pkg.get("vulnerabilities", [])
                        pkg_info = pkg.get("package", {})
                        pkg_name = pkg_info.get("name", "Unknown Package")
                        pkg_version = pkg_info.get("version", "Unknown Version")
                        ecosystem = pkg_info.get("ecosystem", "OpenSource")

                        for vuln in vulnerabilities:
                            finding = self._normalize_osv_vuln(
                                vuln, pkg_name, pkg_version, ecosystem, rel_manifest
                            )
                            if finding:
                                findings.append(finding)

                logger.info(f"OSV-Scanner execution complete. Normalized {len(findings)} SCA findings.")
                return findings
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse OSV-Scanner JSON output: {str(e)}")

        # Fallback inspection: Parse dependency manifests and query official OSV.dev API
        logger.info("Executing real dependency analysis via official OSV.dev database API.")
        findings = await self._real_osv_api_analysis(manifests, source_path)
        return findings

    async def _real_osv_api_analysis(self, manifests: List[str], source_path: Path) -> List[FindingData]:
        import re
        import httpx

        findings: List[FindingData] = []
        queries: List[Dict[str, Any]] = []
        query_meta: List[Dict[str, str]] = []

        # Look for manifest files ONLY inside the uploaded source workspace, not the project root
        candidate_manifests = list(manifests) if manifests else []
        for root, dirs, files in os.walk(source_path):
            # Skip node_modules, venv, .git directories to avoid scanning project internals
            dirs[:] = [d for d in dirs if d not in (
                'node_modules', 'venv', '.venv', 'env', '.git', '__pycache__',
                '.tox', 'dist', 'build', '.eggs', 'site-packages'
            )]
            for fname in files:
                if fname in ("requirements.txt", "package.json", "package-lock.json", "go.mod", "pom.xml", "Cargo.toml", "Cargo.lock"):
                    rel = str(Path(root) / fname)
                    try:
                        rel = str(Path(rel).relative_to(source_path))
                    except Exception:
                        pass
                    if rel not in candidate_manifests:
                        candidate_manifests.append(rel)

        # 1. Parse requirements.txt
        for m_rel in candidate_manifests:
            m_path = source_path / m_rel
            if not m_path.exists():
                continue

            if m_path.name.lower().endswith("requirements.txt") or m_path.name.lower() == "requirements.txt":
                try:
                    content = m_path.read_text(encoding="utf-8", errors="ignore")
                    for line_idx, raw_line in enumerate(content.splitlines(), start=1):
                        line = raw_line.strip().split("#")[0].strip()
                        if not line or line.startswith("-"):
                            continue
                        # Match name==version or name>=version
                        match = re.match(r"^([a-zA-Z0-9_.-]+)\s*(?:==|===|~=)\s*([a-zA-Z0-9_.-]+)", line)
                        if match:
                            pkg_name, pkg_ver = match.group(1), match.group(2)
                            queries.append({"package": {"name": pkg_name, "ecosystem": "PyPI"}, "version": pkg_ver})
                            query_meta.append({"manifest": m_rel, "line": str(line_idx), "name": pkg_name, "version": pkg_ver, "ecosystem": "PyPI"})
                        else:
                            # Package name without exact version
                            clean_name = re.split(r"[><=~!;]", line)[0].strip()
                            if clean_name:
                                queries.append({"package": {"name": clean_name, "ecosystem": "PyPI"}})
                                query_meta.append({"manifest": m_rel, "line": str(line_idx), "name": clean_name, "version": "latest", "ecosystem": "PyPI"})
                except Exception as e:
                    logger.warning(f"Error parsing requirements manifest {m_path}: {e}")

            # 2. Parse package.json
            elif m_path.name.lower() == "package.json":
                try:
                    content = m_path.read_text(encoding="utf-8", errors="ignore")
                    data = json.loads(content)
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    for pkg_name, ver_spec in deps.items():
                        clean_ver = re.sub(r"[^0-9.]", "", ver_spec).strip(".")
                        if clean_ver:
                            queries.append({"package": {"name": pkg_name, "ecosystem": "npm"}, "version": clean_ver})
                        else:
                            queries.append({"package": {"name": pkg_name, "ecosystem": "npm"}})
                        query_meta.append({"manifest": m_rel, "line": "1", "name": pkg_name, "version": clean_ver or "latest", "ecosystem": "npm"})
                except Exception as e:
                    logger.warning(f"Error parsing package.json manifest {m_path}: {e}")

        if not queries:
            logger.info("No parsed dependency packages found to query in OSV database.")
            return findings

        # Query OSV batch API in chunks of 50
        batch_size = 50
        for i in range(0, len(queries), batch_size):
            batch_q = queries[i:i + batch_size]
            batch_m = query_meta[i:i + batch_size]
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post("https://api.osv.dev/v1/querybatch", json={"queries": batch_q})
                    if resp.status_code == 200:
                        res_data = resp.json().get("results", [])
                        for idx, item in enumerate(res_data):
                            vulns = item.get("vulns", [])
                            meta = batch_m[idx] if idx < len(batch_m) else {}
                            for v in vulns:
                                finding = self._normalize_osv_vuln(
                                    v,
                                    meta.get("name", "Unknown"),
                                    meta.get("version", "Unknown"),
                                    meta.get("ecosystem", "PyPI"),
                                    meta.get("manifest", "requirements.txt")
                                )
                                if finding:
                                    findings.append(finding)
            except Exception as ex:
                logger.warning(f"OSV batch query failed: {ex}")

        logger.info(f"OSV live API scan complete. Found {len(findings)} real vulnerabilities.")
        return findings

    def _normalize_osv_vuln(
        self,
        vuln: Dict[str, Any],
        pkg_name: str,
        pkg_version: str,
        ecosystem: str,
        rel_manifest: str
    ) -> Optional[FindingData]:
        try:
            vuln_id = vuln.get("id", "SCA-VULN-UNKNOWN")
            summary = vuln.get("summary") or vuln.get("details") or f"Vulnerability {vuln_id} detected in package {pkg_name}."

            database_specific = vuln.get("database_specific", {})
            severity_str = database_specific.get("severity", "HIGH").upper()
            if severity_str in ("CRITICAL", "MODERATE", "HIGH", "LOW"):
                if severity_str == "MODERATE":
                    severity = FindingSeverity.MEDIUM
                elif severity_str == "CRITICAL":
                    severity = FindingSeverity.CRITICAL
                elif severity_str == "HIGH":
                    severity = FindingSeverity.HIGH
                else:
                    severity = FindingSeverity.LOW
            else:
                severity = FindingSeverity.HIGH

            fixed_version = "latest"
            affected = vuln.get("affected", [])
            for aff in affected:
                ranges = aff.get("ranges", [])
                for r in ranges:
                    events = r.get("events", [])
                    for ev in events:
                        if "fixed" in ev:
                            fixed_version = ev["fixed"]
                            break

            rec = f"Upgrade {pkg_name} to version {fixed_version} or higher in {rel_manifest or 'dependency manifest'}."

            return FindingData(
                title=f"Vulnerability {vuln_id} in {pkg_name} ({pkg_version})",
                description=f"{summary.strip()} (Ecosystem: {ecosystem})",
                severity=severity,
                confidence=FindingConfidence.HIGH,
                category=f"SCA / {ecosystem}",
                file=rel_manifest or "dependency manifest",
                line=1,
                column=1,
                scanner="OSV-Scanner SCA Engine",
                rule_id=vuln_id,
                recommendation=rec,
                raw_metadata={
                    "package": pkg_name,
                    "installed_version": pkg_version,
                    "ecosystem": ecosystem,
                    "fixed_version": fixed_version,
                    "osv_id": vuln_id,
                }
            )
        except Exception as e:
            logger.error(f"Error normalizing OSV vulnerability item: {str(e)}")
            return None

    async def cancel(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass
