import logging
from typing import Dict, Any, Tuple
from app.models.project import RiskLevel

logger = logging.getLogger("zentronyx.core.risk_engine")


class RiskEngine:
    """
    Transparent, formulaic Risk Scoring Engine.
    Formula:
      Score = min(100.0, 30.0 * Critical + 15.0 * High + 5.0 * Medium + 1.0 * Low + 25.0 * MalwareProb + 20.0 * DastCrit)
    Level Mapping:
      >= 75.0 -> CRITICAL
      >= 50.0 -> HIGH
      >= 25.0 -> MEDIUM
      <  25.0 -> LOW
    """

    WEIGHT_CRITICAL = 30.0
    WEIGHT_HIGH = 15.0
    WEIGHT_MEDIUM = 5.0
    WEIGHT_LOW = 1.0
    WEIGHT_MALWARE_PROB = 25.0
    WEIGHT_DAST_CRITICAL = 20.0

    @classmethod
    def calculate_risk_score(
        cls,
        severity_summary: Dict[str, int],
        malware_probability: float = 0.0,
        dast_critical_count: int = 0
    ) -> Tuple[float, RiskLevel, Dict[str, Any]]:
        n_crit = severity_summary.get("CRITICAL", 0)
        n_high = severity_summary.get("HIGH", 0)
        n_med = severity_summary.get("MEDIUM", 0)
        n_low = severity_summary.get("LOW", 0)

        raw_score = (
            (n_crit * cls.WEIGHT_CRITICAL) +
            (n_high * cls.WEIGHT_HIGH) +
            (n_med * cls.WEIGHT_MEDIUM) +
            (n_low * cls.WEIGHT_LOW) +
            (malware_probability * cls.WEIGHT_MALWARE_PROB) +
            (dast_critical_count * cls.WEIGHT_DAST_CRITICAL)
        )

        final_score = round(min(100.0, max(0.0, raw_score)), 2)

        if final_score >= 75.0:
            level = RiskLevel.CRITICAL
        elif final_score >= 50.0:
            level = RiskLevel.HIGH
        elif final_score >= 25.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        breakdown = {
            "formula": "min(100.0, 30*Crit + 15*High + 5*Med + 1*Low + 25*MalwareProb + 20*DastCrit)",
            "critical_contribution": round(n_crit * cls.WEIGHT_CRITICAL, 2),
            "high_contribution": round(n_high * cls.WEIGHT_HIGH, 2),
            "medium_contribution": round(n_med * cls.WEIGHT_MEDIUM, 2),
            "low_contribution": round(n_low * cls.WEIGHT_LOW, 2),
            "malware_contribution": round(malware_probability * cls.WEIGHT_MALWARE_PROB, 2),
            "dast_contribution": round(dast_critical_count * cls.WEIGHT_DAST_CRITICAL, 2),
            "raw_score": round(raw_score, 2),
            "final_score": final_score,
            "risk_level": level.value
        }

        return final_score, level, breakdown
