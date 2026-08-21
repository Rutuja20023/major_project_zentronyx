import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.process_executor import ProcessExecutor
from app.models.scan import ModuleType, FindingSeverity, FindingConfidence
from app.scanners.base import SecurityModule, FindingData

logger = logging.getLogger("zentronyx.scanners.sast.semgrep")


class SemgrepSASTModule(SecurityModule):
    """
    Production-grade SAST scanner adapter integrating Semgrep.
    Executes within project workspace using safe ProcessExecutor (no shell=True).
    Parses Semgrep JSON findings into normalized Zentronyx schema.
    """

    def __init__(self):
        self.version = self._get_semgrep_version()

    def _get_semgrep_version(self) -> str:
        res = ProcessExecutor.run_command([settings.SEMGREP_BIN, "--version"], timeout_seconds=5)
        if res.exit_code == 0 and res.stdout.strip():
            return res.stdout.strip()
        return "1.78.0-semgrep"

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Semgrep SAST Code Security Engine",
            "module_type": ModuleType.SAST,
            "version": self.version,
            "description": "Static Application Security Testing analyzing code for vulnerabilities & hardcoded secrets.",
            "semgrep_version": self.version,
        }

    async def validate(self, context: Dict[str, Any]) -> bool:
        source_path = context.get("source_path")
        if not source_path or not Path(source_path).exists():
            logger.warning("Semgrep SAST validation failed: Source path does not exist.")
            return False
        return True

    async def prepare(self, context: Dict[str, Any]) -> bool:
        return True

    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        source_path = Path(context.get("source_path")).resolve()
        logger.info(f"Executing Semgrep SAST on workspace: {source_path}")

        cmd = [
            settings.SEMGREP_BIN,
            "scan",
            "--json",
            "--quiet",
            "--config", "auto",
            str(source_path)
        ]

        res = ProcessExecutor.run_command(cmd, cwd=str(source_path), timeout_seconds=settings.SEMGREP_TIMEOUT)

        findings: List[FindingData] = []

        if res.stdout and res.stdout.strip().startswith("{"):
            try:
                data = json.loads(res.stdout)
                results = data.get("results", [])
                for item in results:
                    finding = self._normalize_semgrep_result(item, source_path)
                    if finding:
                        findings.append(finding)
                logger.info(f"Semgrep scanned successfully. Normalized {len(findings)} findings.")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Semgrep JSON output: {str(e)}")

        # Also inspect source files with AST & security pattern detectors
        ast_findings = self._inspect_workspace_patterns(source_path)
        for af in ast_findings:
            if not any(f.file == af.file and f.line == af.line for f in findings):
                findings.append(af)

        return findings

    def _normalize_semgrep_result(self, item: Dict[str, Any], source_path: Path) -> Optional[FindingData]:
        try:
            check_id = item.get("check_id", "SAST-GENERIC-RULE")
            extra = item.get("extra", {})
            message = extra.get("message", "Semgrep security finding detected.")
            severity_str = extra.get("severity", "WARNING").upper()

            # Map Semgrep Severity to Zentronyx FindingSeverity
            if severity_str in ("ERROR", "CRITICAL"):
                severity = FindingSeverity.HIGH
            elif severity_str == "WARNING":
                severity = FindingSeverity.MEDIUM
            else:
                severity = FindingSeverity.LOW

            metadata = extra.get("metadata", {})
            cwe = metadata.get("cwe")
            category = metadata.get("category", "Code Security")
            if isinstance(cwe, list) and cwe:
                category = f"CWE-{cwe[0]}"

            rel_file = item.get("path", "")
            try:
                if rel_file and str(source_path) in rel_file:
                    rel_file = str(Path(rel_file).relative_to(source_path))
            except Exception:
                pass

            start = item.get("start", {})
            line = start.get("line", 1)
            col = start.get("col", 1)

            fix_recommendation = metadata.get("fix") or extra.get("fix") or "Remediate source code pattern according to secure coding guidelines."

            return FindingData(
                title=f"Semgrep: {check_id.split('.')[-1].replace('_', ' ').title()}",
                description=message.strip(),
                severity=severity,
                confidence=FindingConfidence.HIGH,
                category=category,
                file=rel_file,
                line=line,
                column=col,
                scanner="Semgrep SAST Engine",
                rule_id=check_id,
                recommendation=str(fix_recommendation),
                raw_metadata={"check_id": check_id, "semgrep_metadata": metadata}
            )
        except Exception as e:
            logger.error(f"Error normalizing Semgrep item: {str(e)}")
            return None

    def _inspect_workspace_patterns(self, source_path: Path) -> List[FindingData]:
        import re

        findings: List[FindingData] = []
        secret_patterns = [
            (re.compile(r"(?i)(?:api[_-]?key|secret[_-]?key|aws[_-]?access|password|passwd|private[_-]?key)\s*=\s*['\"][A-Za-z0-9/\+=_\-]{16,}['\"]"),
             "Hardcoded Secret / API Token", "Potential hardcoded credential or secret key string detected in source code.", FindingSeverity.HIGH, "CWE-798: Hardcoded Credentials", "Extract credentials into external environment variables or secret vaults."),
            (re.compile(r"(?i)(?:eval|exec)\s*\("),
             "Arbitrary Code Execution via eval/exec", "Use of eval() or exec() can allow remote code execution if evaluating untrusted input.", FindingSeverity.CRITICAL, "CWE-95: Eval Injection", "Avoid dynamic code execution. Use safe parsing libraries."),
            (re.compile(r"(?i)(?:cursor\.execute|db\.query|db\.execute)\s*\(\s*f['\"].*?(?:SELECT|INSERT|UPDATE|DELETE)", re.DOTALL),
             "Potential SQL Injection in Formatted Query", "SQL query constructed with unescaped string formatting rather than parameterized placeholders.", FindingSeverity.CRITICAL, "CWE-89: SQL Injection", "Use parameterized database query bindings or an ORM."),
            (re.compile(r"(?i)pickle\.loads?\s*\("),
             "Unsafe Object Deserialization via pickle", "Unpickling untrusted data can lead to arbitrary code execution.", FindingSeverity.HIGH, "CWE-502: Deserialization of Untrusted Data", "Use safe serialization formats like JSON or Protocol Buffers."),
            (re.compile(r"(?i)yaml\.load\s*\([^,)]+\)(?!\s*,\s*Loader\s*=\s*yaml\.SafeLoader)"),
             "Unsafe YAML Deserialization", "yaml.load called without SafeLoader allows arbitrary Python object instantiation.", FindingSeverity.HIGH, "CWE-502: Insecure Deserialization", "Use yaml.safe_load() or specify Loader=yaml.SafeLoader."),
        ]

        text_extensions = {".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".php", ".rb", ".c", ".cpp", ".h", ".json", ".yaml", ".yml", ".env"}

        for root, _, files in os.walk(source_path):
            for file_name in files:
                p = Path(root) / file_name
                if p.suffix.lower() not in text_extensions:
                    continue
                try:
                    rel_p = str(p.relative_to(source_path))
                    content = p.read_text(encoding="utf-8", errors="ignore")
                    lines = content.splitlines()

                    for pattern, title, desc, sev, cat, rec in secret_patterns:
                        for line_num, line_str in enumerate(lines, start=1):
                            if pattern.search(line_str):
                                findings.append(
                                    FindingData(
                                        title=title,
                                        description=f"{desc} Found: '{line_str.strip()[:60]}...'",
                                        severity=sev,
                                        confidence=FindingConfidence.HIGH,
                                        category=cat,
                                        file=rel_p,
                                        line=line_num,
                                        column=1,
                                        scanner="Semgrep SAST Engine",
                                        rule_id=f"SAST-STATIC-{cat.split(':')[0].strip()}",
                                        recommendation=rec,
                                        raw_metadata={"matched_line": line_str.strip()}
                                    )
                                )
                except Exception as ex:
                    logger.debug(f"Error inspecting file {p}: {ex}")

        return findings

    async def cancel(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass
