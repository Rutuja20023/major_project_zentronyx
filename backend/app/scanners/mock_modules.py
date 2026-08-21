import asyncio
from typing import Dict, Any, List
from app.models.scan import ModuleType, FindingSeverity, FindingConfidence
from app.scanners.base import SecurityModule, FindingData


class MockSASTModule(SecurityModule):
    """Mock SAST scanner analyzing code syntax and pattern vulnerabilities."""

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Static Application Security Testing (SAST)",
            "module_type": ModuleType.SAST,
            "version": "1.0.0-mock",
            "description": "Mock SAST engine for static code pattern analysis."
        }

    async def validate(self, context: Dict[str, Any]) -> bool:
        return True

    async def prepare(self, context: Dict[str, Any]) -> bool:
        return True

    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        await asyncio.sleep(0.1)  # Simulate brief processing
        entry_points = context.get("entry_points", ["app.py"])
        primary_lang = context.get("primary_language", "Python")

        findings = [
            FindingData(
                title=f"Potential Hardcoded Secret / API Token in {primary_lang}",
                description="Detected plain text high-entropy secret pattern assignment in application entry point.",
                severity=FindingSeverity.HIGH,
                confidence=FindingConfidence.HIGH,
                category="Hardcoded Secrets",
                scanner="Mock-SAST-SecretScanner",
                rule_id="SAST-SEC-001",
                file=entry_points[0] if entry_points else "config.py",
                line=42,
                column=12,
                recommendation="Store sensitive API credentials in environment variables or external secret manager.",
                raw_metadata={"pattern": "SECRET_KEY = 'super_secret'"}
            ),
            FindingData(
                title="Unsanitized Input in Database Query Construction",
                description="Raw string formatting detected inside database query builder invocation.",
                severity=FindingSeverity.CRITICAL,
                confidence=FindingConfidence.MEDIUM,
                category="SQL Injection",
                scanner="Mock-SAST-TaintAnalyzer",
                rule_id="SAST-SQLI-002",
                file="db_helper.py" if primary_lang == "Python" else "Repository.java",
                line=88,
                column=5,
                recommendation="Use parameterized query placeholders or ORM parameter binding.",
                raw_metadata={"taint_source": "request.args.get('id')"}
            )
        ]
        return findings

    async def cancel(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass


class MockSCAModule(SecurityModule):
    """Mock Software Composition Analysis (SCA) module for dependency checking."""

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Software Composition Analysis (SCA)",
            "module_type": ModuleType.SCA,
            "version": "1.0.0-mock",
            "description": "Mock SCA engine for third-party vulnerability detection."
        }

    async def validate(self, context: Dict[str, Any]) -> bool:
        return True

    async def prepare(self, context: Dict[str, Any]) -> bool:
        return True

    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        await asyncio.sleep(0.1)
        manifests = context.get("dependency_manifests", ["requirements.txt"])

        findings = [
            FindingData(
                title="Outdated Library with Known CVE-2023-32681 Vulnerability",
                description="The declared dependency version contains a critical unauthenticated remote code execution vulnerability.",
                severity=FindingSeverity.CRITICAL,
                confidence=FindingConfidence.HIGH,
                category="Outdated Dependencies",
                scanner="Mock-SCA-VulnerabilityDb",
                rule_id="CVE-2023-32681",
                file=manifests[0] if manifests else "requirements.txt",
                line=5,
                column=1,
                recommendation="Upgrade dependency version to latest patched release.",
                raw_metadata={"cve_id": "CVE-2023-32681", "cvss_score": 9.8}
            )
        ]
        return findings

    async def cancel(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass


class MockDASTModule(SecurityModule):
    """Mock Dynamic Application Security Testing (DAST) module for web endpoints."""

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Dynamic Application Security Testing (DAST)",
            "module_type": ModuleType.DAST,
            "version": "1.0.0-mock",
            "description": "Mock DAST engine for web endpoint vulnerability scanning."
        }

    async def validate(self, context: Dict[str, Any]) -> bool:
        return True

    async def prepare(self, context: Dict[str, Any]) -> bool:
        return True

    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        await asyncio.sleep(0.1)
        framework = context.get("framework", "FastAPI")

        findings = [
            FindingData(
                title=f"Missing Anti-Clickjacking Content Security Headers in {framework}",
                description="HTTP response missing X-Frame-Options or Content-Security-Policy frame-ancestors directive.",
                severity=FindingSeverity.MEDIUM,
                confidence=FindingConfidence.HIGH,
                category="Security Headers",
                scanner="Mock-DAST-HeaderChecker",
                rule_id="DAST-HDR-001",
                file="HTTP Response",
                line=1,
                column=1,
                recommendation="Configure X-Frame-Options: DENY in web middleware configuration.",
                raw_metadata={"header_missing": "X-Frame-Options"}
            )
        ]
        return findings

    async def cancel(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass


class MockBinaryAnalysisModule(SecurityModule):
    """Mock Binary Analysis module for executable & byte-code inspection."""

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Binary & Executable Analysis",
            "module_type": ModuleType.BINARY_ANALYSIS,
            "version": "1.0.0-mock",
            "description": "Mock binary scanner checking mitigation flags (NX, ASLR, PIE)."
        }

    async def validate(self, context: Dict[str, Any]) -> bool:
        return True

    async def prepare(self, context: Dict[str, Any]) -> bool:
        return True

    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        await asyncio.sleep(0.1)
        binary_type = context.get("binary_type", "ELF / PE Binary")

        findings = [
            FindingData(
                title=f"Disabled Stack Canary Protection in {binary_type}",
                description="Target binary compilation flags omit stack-smashing protection (-fstack-protector).",
                severity=FindingSeverity.HIGH,
                confidence=FindingConfidence.HIGH,
                category="Binary Mitigations",
                scanner="Mock-Binary-HardeningCheck",
                rule_id="BIN-MIT-001",
                file="binary_artifact",
                line=0,
                column=0,
                recommendation="Enable -fstack-protector-strong and Position Independent Executable (-fPIE) in compiler flags.",
                raw_metadata={"canary": False, "nx": True, "pie": False}
            )
        ]
        return findings

    async def cancel(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass


class MockGNNModule(SecurityModule):
    """Mock Graph Neural Network (GNN) AI Code Analysis module."""

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Graph Neural Network (GNN) Vulnerability Predictor",
            "module_type": ModuleType.GNN,
            "version": "1.0.0-mock",
            "description": "Mock GNN model analyzing Code Property Graphs (CPG)."
        }

    async def validate(self, context: Dict[str, Any]) -> bool:
        return True

    async def prepare(self, context: Dict[str, Any]) -> bool:
        return True

    async def execute(self, context: Dict[str, Any]) -> List[FindingData]:
        await asyncio.sleep(0.1)

        findings = [
            FindingData(
                title="GNN High-Probability Control Flow Path Anomaly",
                description="Graph Neural Network model detected high graph representation similarity to known deserialization attack vector.",
                severity=FindingSeverity.HIGH,
                confidence=FindingConfidence.MEDIUM,
                category="AI-Predicted Vulnerability",
                scanner="Mock-GNN-GraphScanner",
                rule_id="GNN-CPG-007",
                file="utils/serializer.py",
                line=27,
                column=4,
                recommendation="Replace generic deserialization with type-safe schema validation.",
                raw_metadata={"similarity_score": 0.92, "graph_nodes": 142}
            )
        ]
        return findings

    async def cancel(self) -> None:
        pass

    async def cleanup(self) -> None:
        pass
