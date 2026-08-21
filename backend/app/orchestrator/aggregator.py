import hashlib
import logging
from typing import List, Dict, Any
from app.scanners.base import FindingData
from app.models.scan import FindingLifecycleStatus

logger = logging.getLogger("zentronyx.orchestrator.aggregator")


class ResultAggregator:
    """
    Deduplication & Result Aggregator Engine.
    Generates stable SHA-256 fingerprints for findings and manages finding lifecycle.
    """

    @staticmethod
    def compute_fingerprint(finding: FindingData) -> str:
        """Computes stable SHA-256 fingerprint for finding deduplication."""
        file_part = (finding.file or "").strip().lower()
        line_part = str(finding.line or 1)
        rule_part = (finding.rule_id or "").strip().lower()
        scanner_part = (finding.scanner or "").strip().lower()

        raw_str = f"{scanner_part}:{rule_part}:{file_part}:{line_part}"
        return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    @classmethod
    def deduplicate_findings(cls, findings: List[FindingData]) -> List[FindingData]:
        """Deduplicates findings in single scan run based on fingerprint."""
        seen = set()
        deduped: List[FindingData] = []

        for f in findings:
            fp = cls.compute_fingerprint(f)
            if fp not in seen:
                seen.add(fp)
                deduped.append(f)

        logger.info(f"Deduplicated findings: {len(findings)} -> {len(deduped)}")
        return deduped
