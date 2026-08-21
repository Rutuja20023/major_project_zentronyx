import pytest
import hmac
import hashlib
from app.core.risk_engine import RiskEngine
from app.core.policy_engine import PolicyEngine
from app.models.policy import PolicyDecision, SecurityPolicy
from app.orchestrator.aggregator import ResultAggregator
from app.scanners.base import FindingData
from app.models.scan import FindingSeverity, FindingConfidence
from app.api.v1.endpoints.webhooks import verify_github_signature


def test_risk_engine_calculation():
    summary = {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 5, "INFO": 0}
    malware_prob = 0.85
    dast_crit = 1

    score, level, breakdown = RiskEngine.calculate_risk_score(summary, malware_prob, dast_crit)

    # 30*1 + 15*2 + 5*3 + 1*5 + 25*0.85 + 20*1 = 30 + 30 + 15 + 5 + 21.25 + 20 = 121.25 -> capped at 100.0
    assert score == 100.0
    assert level.value == "CRITICAL"
    assert breakdown["critical_contribution"] == 30.0
    assert breakdown["high_contribution"] == 30.0


def test_policy_engine_evaluation():
    # Test BLOCK decision
    crit_summary = {"CRITICAL": 1, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    decision, reasons, violations = PolicyEngine.evaluate(crit_summary, malware_probability=0.0)
    assert decision == PolicyDecision.BLOCK
    assert len(violations) > 0

    # Test PASS decision
    clean_summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 0}
    decision_pass, reasons_pass, violations_pass = PolicyEngine.evaluate(clean_summary, malware_probability=0.05)
    assert decision_pass == PolicyDecision.PASS
    assert len(violations_pass) == 0


def test_result_aggregator_fingerprint():
    finding = FindingData(
        title="SQL Injection Vulnerability",
        description="Raw SQL query concatenation",
        severity=FindingSeverity.HIGH,
        confidence=FindingConfidence.HIGH,
        category="Injection",
        file="app/db.py",
        line=42,
        column=1,
        scanner="Semgrep SAST Engine",
        rule_id="semgrep.sqli"
    )

    fp1 = ResultAggregator.compute_fingerprint(finding)
    fp2 = ResultAggregator.compute_fingerprint(finding)
    assert len(fp1) == 64
    assert fp1 == fp2  # Deterministic fingerprint match


def test_github_signature_verification():
    secret = "test_webhook_secret_key"
    payload = b'{"ref": "refs/heads/main", "repository": {"clone_url": "https://github.com/org/repo.git"}}'
    sig = "sha256=" + hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    assert verify_github_signature(payload, sig, secret) is True
    assert verify_github_signature(payload, "sha256=invalid", secret) is False
