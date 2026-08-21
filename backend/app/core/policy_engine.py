import logging
from typing import Dict, Any, List, Tuple, Optional
from app.models.policy import PolicyDecision, SecurityPolicy

logger = logging.getLogger("zentronyx.core.policy_engine")


class PolicyEngine:
    """
    Evaluates security scan findings against configurable SecurityPolicy rules.
    Returns PASS, WARN, or BLOCK decision.
    """

    @classmethod
    def evaluate(
        cls,
        severity_summary: Dict[str, int],
        malware_probability: float = 0.0,
        dast_critical_count: int = 0,
        sca_critical_count: int = 0,
        policy: Optional[SecurityPolicy] = None
    ) -> Tuple[PolicyDecision, List[str], List[Dict[str, Any]]]:
        reasons: List[str] = []
        violations: List[Dict[str, Any]] = []

        # Policy thresholds (use provided policy or default security policy)
        max_crit = policy.max_critical_findings if policy else 0
        max_high = policy.max_high_findings if policy else 3
        max_malware_prob = policy.max_malware_probability if policy else 0.70
        block_dast = policy.block_on_dast_critical if policy is not None else True
        block_sca = policy.block_on_critical_sca if policy is not None else True

        n_crit = severity_summary.get("CRITICAL", 0)
        n_high = severity_summary.get("HIGH", 0)
        n_med = severity_summary.get("MEDIUM", 0)

        # Rule 1: Critical Findings Threshold
        if n_crit > max_crit:
            msg = f"Critical vulnerability count ({n_crit}) exceeds allowed maximum threshold ({max_crit})."
            reasons.append(msg)
            violations.append({"rule": "MAX_CRITICAL_EXCEEDED", "actual": n_crit, "allowed": max_crit})

        # Rule 2: High Findings Threshold
        if n_high > max_high:
            msg = f"High vulnerability count ({n_high}) exceeds allowed threshold ({max_high})."
            reasons.append(msg)
            violations.append({"rule": "MAX_HIGH_EXCEEDED", "actual": n_high, "allowed": max_high})

        # Rule 3: GNN Malware Probability
        if malware_probability > max_malware_prob:
            msg = f"GNN Malware probability ({malware_probability:.2f}) exceeds policy threshold ({max_malware_prob:.2f})."
            reasons.append(msg)
            violations.append({"rule": "MALWARE_PROBABILITY_EXCEEDED", "actual": malware_probability, "threshold": max_malware_prob})

        # Rule 4: DAST Critical Block
        if block_dast and dast_critical_count > 0:
            msg = f"DAST scan detected {dast_critical_count} critical web application vulnerabilities."
            reasons.append(msg)
            violations.append({"rule": "DAST_CRITICAL_BLOCK", "actual": dast_critical_count})

        # Rule 5: SCA Critical Block
        if block_sca and sca_critical_count > 0:
            msg = f"SCA scan detected {sca_critical_count} critical dependency vulnerabilities (CVE)."
            reasons.append(msg)
            violations.append({"rule": "SCA_CRITICAL_BLOCK", "actual": sca_critical_count})

        # Final Decision Logic
        if violations:
            return PolicyDecision.BLOCK, reasons, violations

        if n_high > 0 or n_med > 5:
            warn_msg = f"Security warnings present: {n_high} High and {n_med} Medium findings."
            return PolicyDecision.WARN, [warn_msg], []

        return PolicyDecision.PASS, ["All security policy checks passed successfully."], []
