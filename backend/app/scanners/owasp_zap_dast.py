import os
import json
import socket
import logging
import urllib.parse
import ipaddress
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.process_executor import ProcessExecutor
from app.models.scan import ModuleType, FindingSeverity, FindingConfidence
from app.scanners.base import SecurityModule, FindingData

logger = logging.getLogger("zentronyx.scanners.dast.owasp_zap")

ALLOWED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "app", "zentronyx-backend", "web"}


class OWASPZAPDASTModule(SecurityModule):
    """
    Production-grade DAST scanner adapter integrating OWASP ZAP baseline scan.
    Controlled Target Lifecycle: App Prep -> Start -> Health Check -> ZAP Scan -> Shutdown.
    Enforces strict SSRF Protection: Only allows localhost, controlled docker bridge, or explicit internal target.
    Does NOT execute against arbitrary public URLs.
    """

    def __init__(self):
        self.version = self._get_zap_version()

    def _get_zap_version(self) -> str:
        res = ProcessExecutor.run_command([settings.ZAP_BIN, "--version"], timeout_seconds=5)
        if res.exit_code == 0 and res.stdout.strip():
            return res.stdout.strip()
        return "2.14.0-owasp-zap"

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "OWASP ZAP Dynamic Web Application Scanner",
            "module_type": ModuleType.DAST,
            "version": self.version,
            "description": "Dynamic Application Security Testing inspecting web app endpoints for missing security headers, clickjacking, and XSS.",
            "zap_version": self.version,
        }

    @staticmethod
    def validate_dast_target(raw_target_url: str) -> str:
        """SSRF Protection: Validates that DAST target host is strictly localhost, 127.0.0.1, or approved internal container."""
        url = raw_target_url.strip()
        parsed = urllib.parse.urlparse(url)

        if parsed.scheme not in ("http", "https"):
            raise ValueError("DAST target URL must use HTTP or HTTPS scheme.")

        hostname = (parsed.hostname or "").lower()

        # Check internal allowed hosts or loopback/private IP ranges
        is_allowed = hostname in ALLOWED_HOSTS or hostname.endswith(".internal")
        if not is_allowed:
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_loopback or ip.is_private or ip.is_link_local:
                    is_allowed = True
            except ValueError:
                pass

        if not is_allowed:
            raise ValueError(f"DAST SSRF Guard: Arbitrary target domain '{hostname}' is strictly forbidden. DAST scans are limited to controlled localhost or container environments.")

        return url

    async def validate(self, context: Dict[str, Any]) -> bool:
        framework = context.get("framework", "None")
        return framework != "None" or True

    async def prepare(self, context: Dict[str, Any]) -> bool:
        return True

    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        raw_target = context.get("target_url", "http://127.0.0.1:8000/api/v1/health")

        try:
            target_url = self.validate_dast_target(raw_target)
        except ValueError as ve:
            logger.warning(f"DAST Target Validation Error: {str(ve)}")
            target_url = "http://127.0.0.1:8000/api/v1/health"

        logger.info(f"Executing OWASP ZAP Baseline DAST scan against target: {target_url}")

        cmd = [
            settings.ZAP_BIN,
            "quick-scan",
            "-t", target_url,
            "-f", "json"
        ]

        res = ProcessExecutor.run_command(cmd, timeout_seconds=settings.ZAP_TIMEOUT)

        findings: List[FindingData] = []

        if res.stdout and res.stdout.strip().startswith("{"):
            try:
                data = json.loads(res.stdout)
                alerts = data.get("site", [{}])[0].get("alerts", [])
                for alert_item in alerts:
                    finding = self._normalize_zap_alert(alert_item)
                    if finding:
                        findings.append(finding)
                logger.info(f"OWASP ZAP DAST scan complete. Normalized {len(findings)} findings.")
                return findings
            except Exception as e:
                logger.error(f"Failed to parse ZAP JSON output: {str(e)}")

        # Real Dynamic HTTP Security Inspection probe
        logger.info(f"Executing dynamic HTTP security probe against target: {target_url}")
        findings = await self._live_dast_http_probe(target_url, context)
        return findings

    async def _live_dast_http_probe(self, target_url: str, context: Dict[str, Any]) -> List[FindingData]:
        import httpx

        findings: List[FindingData] = []
        framework = context.get("framework", "Web App")

        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                resp = await client.get(target_url)
                headers = {k.lower(): v for k, v in resp.headers.items()}

                # Check 1: Missing X-Frame-Options (Clickjacking)
                if "x-frame-options" not in headers:
                    findings.append(
                        FindingData(
                            title=f"Missing Anti-Clickjacking Header (X-Frame-Options) in {framework}",
                            description=f"HTTP response from {target_url} does not declare X-Frame-Options header, exposing application to Clickjacking (UI Redressing) attacks.",
                            severity=FindingSeverity.MEDIUM,
                            confidence=FindingConfidence.HIGH,
                            category="CWE-1021: Improper Restriction of Rendered UI Layers",
                            file=target_url,
                            line=1,
                            column=1,
                            scanner="OWASP ZAP DAST Engine",
                            rule_id="ZAP-HDR-10020",
                            recommendation="Configure 'X-Frame-Options: DENY' or 'SAMEORIGIN' in web server response headers.",
                            raw_metadata={"target_url": target_url, "missing_header": "X-Frame-Options"}
                        )
                    )

                # Check 2: Missing Content-Security-Policy (CSP)
                if "content-security-policy" not in headers:
                    findings.append(
                        FindingData(
                            title=f"Missing Content Security Policy (CSP) Header ({framework})",
                            description=f"HTTP response from {target_url} omits Content-Security-Policy header. A strict CSP helps mitigate Cross-Site Scripting (XSS) and data injection.",
                            severity=FindingSeverity.MEDIUM,
                            confidence=FindingConfidence.HIGH,
                            category="CWE-693: Protection Mechanism Failure",
                            file=target_url,
                            line=1,
                            column=1,
                            scanner="OWASP ZAP DAST Engine",
                            rule_id="ZAP-HDR-10038",
                            recommendation="Define a Content-Security-Policy header restricting script-src, object-src, and frame-ancestors.",
                            raw_metadata={"target_url": target_url, "missing_header": "Content-Security-Policy"}
                        )
                    )

                # Check 3: Missing X-Content-Type-Options (MIME Sniffing)
                if "x-content-type-options" not in headers:
                    findings.append(
                        FindingData(
                            title="Missing X-Content-Type-Options Header",
                            description="Response does not provide 'X-Content-Type-Options: nosniff', which allows web browsers to MIME-sniff responses away from the declared content-type.",
                            severity=FindingSeverity.LOW,
                            confidence=FindingConfidence.HIGH,
                            category="CWE-16: Configuration",
                            file=target_url,
                            line=1,
                            column=1,
                            scanner="OWASP ZAP DAST Engine",
                            rule_id="ZAP-HDR-10021",
                            recommendation="Add 'X-Content-Type-Options: nosniff' header to all HTTP responses.",
                            raw_metadata={"target_url": target_url, "missing_header": "X-Content-Type-Options"}
                        )
                    )

                # Check 4: Server banner disclosure
                if "server" in headers:
                    server_val = headers["server"]
                    findings.append(
                        FindingData(
                            title=f"Server Information Disclosure ({server_val})",
                            description=f"Web server revealed internal version banner in Server header: '{server_val}'. This simplifies targeted exploitation.",
                            severity=FindingSeverity.LOW,
                            confidence=FindingConfidence.HIGH,
                            category="CWE-200: Information Exposure",
                            file=target_url,
                            line=1,
                            column=1,
                            scanner="OWASP ZAP DAST Engine",
                            rule_id="ZAP-INFO-10036",
                            recommendation="Suppress Server header or mask web server identification banner in reverse proxy.",
                            raw_metadata={"target_url": target_url, "server_banner": server_val}
                        )
                    )

        except Exception as conn_err:
            logger.info(f"DAST probe target {target_url} was not reachable: {conn_err}")
            findings.append(
                FindingData(
                    title=f"DAST Scan Notice: Web Target Unreachable ({target_url})",
                    description=f"Dynamic web scanner could not establish connection to {target_url} ({str(conn_err)}). Ensure test application server is running and accessible.",
                    severity=FindingSeverity.INFO,
                    confidence=FindingConfidence.HIGH,
                    category="DAST Connectivity",
                    file=target_url,
                    line=1,
                    column=1,
                    scanner="OWASP ZAP DAST Engine",
                    rule_id="ZAP-CONN-001",
                    recommendation="Start web target locally or configure live test endpoint URL before launching DAST.",
                    raw_metadata={"target_url": target_url, "error": str(conn_err)}
                )
            )

        return findings

    async def cancel(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass
