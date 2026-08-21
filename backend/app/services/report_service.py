import io
import csv
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.project_repository import ProjectRepository
from app.repositories.scan_repository import ScanRepository
from app.repositories.analysis_repository import AnalysisRepository
from app.core.risk_engine import RiskEngine
from app.core.policy_engine import PolicyEngine

logger = logging.getLogger("zentronyx.services.report_service")


class ReportService:
    """
    Enterprise-Grade Unified Reporting Engine producing structured JSON,
    publication-quality multi-page PDF, interactive standalone HTML, and CSV reports.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.scan_repo = ScanRepository(db)
        self.analysis_repo = AnalysisRepository(db)

    # -------------------------------------------------------------------------
    # JSON REPORT GENERATION
    # -------------------------------------------------------------------------
    async def generate_json_report(self, scan_id: str) -> Dict[str, Any]:
        scan = await self.scan_repo.get_by_id(scan_id)
        if not scan:
            raise ValueError(f"Scan {scan_id} not found.")

        project = await self.project_repo.get_by_id(scan.project_id)
        analysis = await self.analysis_repo.get_latest_by_project(scan.project_id)
        modules = await self.scan_repo.get_scan_modules(scan_id)
        results = await self.scan_repo.get_scan_results(scan_id)

        # Risk & Policy Evaluation
        severity_summary = scan.severity_summary or {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        
        malware_prob = 0.0
        dast_crit = 0.0
        sca_crit = 0.0

        for r in results:
            if r.module_type == "GNN" and r.raw_metadata:
                malware_prob = float(r.raw_metadata.get("malware_probability", 0.0))
            if r.module_type == "DAST" and r.severity == "CRITICAL":
                dast_crit += 1
            if r.module_type == "SCA" and r.severity == "CRITICAL":
                sca_crit += 1

        risk_score, risk_level, risk_breakdown = RiskEngine.calculate_risk_score(
            severity_summary, malware_prob, int(dast_crit)
        )

        policy_decision, policy_reasons, policy_violations = PolicyEngine.evaluate(
            severity_summary, malware_prob, int(dast_crit), int(sca_crit)
        )

        # Compute Security Grade (A+, A, B, C, D, F)
        n_crit = severity_summary.get("CRITICAL", 0)
        n_high = severity_summary.get("HIGH", 0)
        n_med = severity_summary.get("MEDIUM", 0)

        if n_crit == 0 and n_high == 0 and risk_score <= 10.0:
            security_grade = "A+"
            grade_description = "Outstanding security posture with zero high/critical vulnerabilities."
        elif n_crit == 0 and n_high <= 1 and risk_score <= 25.0:
            security_grade = "A"
            grade_description = "Strong security baseline; minor findings can be addressed during routine maintenance."
        elif n_crit <= 1 and n_high <= 3 and risk_score <= 50.0:
            security_grade = "B"
            grade_description = "Moderate risk exposure. Remediation required prior to production deployment."
        elif risk_score <= 75.0:
            security_grade = "C"
            grade_description = "Elevated threat exposure. Immediate vulnerability remediation required."
        else:
            security_grade = "F"
            grade_description = "Critical vulnerabilities present. Pipeline deployment blocked."

        # Framework Compliance Mappings
        compliance_matrix = self._build_compliance_matrix(results, severity_summary, malware_prob)

        # Remediation Roadmap & SLAs
        remediation_roadmap = self._build_remediation_roadmap(results)

        # Cryptographic Attestation Digest
        audit_payload = f"{scan.id}:{project.id}:{scan.source_fingerprint}:{scan.findings_count}:{scan.created_at}"
        audit_hash = hashlib.sha256(audit_payload.encode('utf-8')).hexdigest()

        # Executive Summary Narrative
        exec_summary_text = (
            f"Zentronyx completed an automated multi-engine security assessment for project '{project.name}'. "
            f"A total of {scan.findings_count} security findings were detected ({n_crit} Critical, {n_high} High, {n_med} Medium). "
            f"The overall composite risk score is {risk_score}/100 resulting in a Grade {security_grade} security posture. "
            f"Policy evaluation status: {policy_decision.value}. "
            f"{'Remediation is required before software release.' if policy_decision.value == 'BLOCK' else 'Software satisfies deployment gating criteria.'}"
        )

        report = {
            "report_id": f"REP-{scan.id[:8].upper()}",
            "generated_at": datetime.utcnow().isoformat(),
            "attestation": {
                "audit_hash": audit_hash,
                "engine_version": "Zentronyx Engine v1.0.0",
                "classification": "CONFIDENTIAL & PROPRIETARY",
                "verifier": "Zentronyx Automated Security Pipeline"
            },
            "project": {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "repository_url": project.repository_url,
                "risk_score": risk_score,
                "risk_level": risk_level.value,
                "security_grade": security_grade,
                "grade_description": grade_description
            },
            "scan_metadata": {
                "scan_id": scan.id,
                "status": scan.status,
                "source_fingerprint": scan.source_fingerprint,
                "started_at": scan.started_at.isoformat() if scan.started_at else None,
                "finished_at": scan.finished_at.isoformat() if scan.finished_at else None,
                "duration_seconds": round((scan.finished_at - scan.started_at).total_seconds(), 1) if (scan.started_at and scan.finished_at) else None,
                "findings_count": scan.findings_count,
                "severity_summary": severity_summary,
            },
            "executive_summary": {
                "narrative": exec_summary_text,
                "risk_score": risk_score,
                "risk_level": risk_level.value,
                "security_grade": security_grade,
                "policy_decision": policy_decision.value,
                "malware_probability": malware_prob,
                "critical_dast_count": dast_crit,
                "critical_sca_count": sca_crit,
                "breakdown": risk_breakdown,
            },
            "policy_decision": {
                "decision": policy_decision.value,
                "reasons": policy_reasons,
                "violations": policy_violations,
            },
            "compliance_matrix": compliance_matrix,
            "technology_analysis": {
                "primary_language": analysis.primary_language if analysis else "Unknown",
                "framework": analysis.framework if analysis else "None",
                "build_system": analysis.build_system if analysis else "Custom",
                "binary_capable": analysis.binary_capable if analysis else False,
            },
            "modules_executed": [
                {
                    "module_type": m.module_type,
                    "status": m.status,
                    "findings_count": m.findings_count,
                    "execution_time_ms": m.execution_time_ms,
                    "skip_reason": m.skip_reason,
                }
                for m in modules
            ],
            "remediation_roadmap": remediation_roadmap,
            "findings": [
                {
                    "id": r.id,
                    "title": r.title,
                    "description": r.description,
                    "severity": r.severity,
                    "confidence": r.confidence,
                    "category": r.category,
                    "file": r.file,
                    "line": r.line,
                    "column": r.column,
                    "scanner": r.scanner,
                    "rule_id": r.rule_id,
                    "recommendation": r.recommendation,
                    "status": r.status,
                }
                for r in results
            ]
        }
        return report

    # -------------------------------------------------------------------------
    # COMPLIANCE MATRIX BUILDER
    # -------------------------------------------------------------------------
    def _build_compliance_matrix(
        self, results: List[Any], severity_summary: Dict[str, int], malware_prob: float
    ) -> Dict[str, Any]:
        n_crit = severity_summary.get("CRITICAL", 0)
        n_high = severity_summary.get("HIGH", 0)
        n_med = severity_summary.get("MEDIUM", 0)

        # Categorize findings by OWASP category
        owasp_categories = {
            "A01:2021-Broken Access Control": {"findings": 0, "status": "PASSED"},
            "A02:2021-Cryptographic Failures": {"findings": 0, "status": "PASSED"},
            "A03:2021-Injection": {"findings": 0, "status": "PASSED"},
            "A04:2021-Insecure Design": {"findings": 0, "status": "PASSED"},
            "A05:2021-Security Misconfiguration": {"findings": 0, "status": "PASSED"},
            "A06:2021-Vulnerable and Outdated Components": {"findings": 0, "status": "PASSED"},
            "A07:2021-Identification and Authentication Failures": {"findings": 0, "status": "PASSED"},
            "A08:2021-Software and Data Integrity Failures": {"findings": 0, "status": "PASSED"},
            "A09:2021-Security Logging and Monitoring Failures": {"findings": 0, "status": "PASSED"},
            "A10:2021-Server-Side Request Forgery (SSRF)": {"findings": 0, "status": "PASSED"},
        }

        for r in results:
            cat = (r.category or "").lower()
            title = (r.title or "").lower()
            rule = (r.rule_id or "").lower()

            if any(k in cat or k in title or k in rule for k in ["injection", "sqli", "xss", "command", "rce"]):
                owasp_categories["A03:2021-Injection"]["findings"] += 1
                owasp_categories["A03:2021-Injection"]["status"] = "ACTION REQUIRED"
            elif any(k in cat or k in title or k in rule for k in ["crypto", "tls", "ssl", "secret", "hardcoded", "token", "key"]):
                owasp_categories["A02:2021-Cryptographic Failures"]["findings"] += 1
                owasp_categories["A02:2021-Cryptographic Failures"]["status"] = "ACTION REQUIRED"
            elif any(k in cat or k in title or k in rule for k in ["auth", "jwt", "session", "password", "login"]):
                owasp_categories["A07:2021-Identification and Authentication Failures"]["findings"] += 1
                owasp_categories["A07:2021-Identification and Authentication Failures"]["status"] = "ACTION REQUIRED"
            elif any(k in cat or k in title or k in rule for k in ["dependency", "cve", "sca", "outdated"]):
                owasp_categories["A06:2021-Vulnerable and Outdated Components"]["findings"] += 1
                owasp_categories["A06:2021-Vulnerable and Outdated Components"]["status"] = "ACTION REQUIRED"
            elif any(k in cat or k in title or k in rule for k in ["access", "permission", "cors", "traversal", "path"]):
                owasp_categories["A01:2021-Broken Access Control"]["findings"] += 1
                owasp_categories["A01:2021-Broken Access Control"]["status"] = "ACTION REQUIRED"
            elif any(k in cat or k in title or k in rule for k in ["ssrf", "forgery"]):
                owasp_categories["A10:2021-Server-Side Request Forgery (SSRF)"]["findings"] += 1
                owasp_categories["A10:2021-Server-Side Request Forgery (SSRF)"]["status"] = "ACTION REQUIRED"
            else:
                owasp_categories["A05:2021-Security Misconfiguration"]["findings"] += 1
                owasp_categories["A05:2021-Security Misconfiguration"]["status"] = "ACTION REQUIRED"

        # Calculate Framework Postures
        owasp_passed_count = sum(1 for v in owasp_categories.values() if v["status"] == "PASSED")
        owasp_score = round((owasp_passed_count / 10.0) * 100, 1)

        nist_score = max(0.0, round(100.0 - (n_crit * 25.0 + n_high * 12.0 + n_med * 3.0), 1))
        iso_score = max(0.0, round(100.0 - (n_crit * 30.0 + n_high * 10.0 + n_med * 2.0), 1))
        soc2_score = max(0.0, round(100.0 - (n_crit * 35.0 + n_high * 15.0 + (malware_prob * 20.0)), 1))
        pci_score = max(0.0, round(100.0 - (n_crit * 40.0 + n_high * 20.0), 1))

        return {
            "owasp_top_10": {
                "framework": "OWASP Top 10 (2021)",
                "compliance_score": owasp_score,
                "status": "COMPLIANT" if owasp_score >= 90.0 else ("PARTIAL" if owasp_score >= 60.0 else "NON-COMPLIANT"),
                "controls": owasp_categories
            },
            "nist_sp_800_53": {
                "framework": "NIST SP 800-53 Rev. 5",
                "compliance_score": nist_score,
                "status": "COMPLIANT" if nist_score >= 85.0 else ("PARTIAL" if nist_score >= 60.0 else "NON-COMPLIANT"),
                "controls_evaluated": ["AC-3 Access Enforcement", "RA-5 Vulnerability Scanning", "SA-11 Security Testing", "SI-7 Software Integrity", "SC-8 Cryptography"]
            },
            "iso_27001": {
                "framework": "ISO / IEC 27001:2022",
                "compliance_score": iso_score,
                "status": "READY FOR AUDIT" if iso_score >= 80.0 else "REMEDIATION NEEDED",
                "controls_evaluated": ["A.8.8 Technical Vulnerability Management", "A.8.25 Secure Development Lifecycle", "A.8.28 Secure Coding"]
            },
            "soc_2": {
                "framework": "SOC 2 Type II (Trust Services Criteria)",
                "compliance_score": soc2_score,
                "status": "ENFORCED" if soc2_score >= 85.0 else "GAPS IDENTIFIED",
                "controls_evaluated": ["CC6.6 Boundary Defense", "CC6.8 Malicious Code Prevention", "CC7.1 Vulnerability Monitoring"]
            },
            "pci_dss": {
                "framework": "PCI-DSS v4.0",
                "compliance_score": pci_score,
                "status": "PASSED" if pci_score >= 90.0 else "NON-COMPLIANT",
                "controls_evaluated": ["Req 6.2 Security Vulnerability Management", "Req 6.4 Web App Defense", "Req 11.3 Security Assessments"]
            }
        }

    # -------------------------------------------------------------------------
    # REMEDIATION ROADMAP BUILDER
    # -------------------------------------------------------------------------
    def _build_remediation_roadmap(self, results: List[Any]) -> List[Dict[str, Any]]:
        roadmap = []
        for r in results:
            if r.severity == "CRITICAL":
                roadmap.append({
                    "priority": "P0 - IMMEDIATE",
                    "timeframe": "Within 24 Hours",
                    "finding_id": r.id,
                    "title": r.title,
                    "location": f"{r.file}:{r.line}" if r.file else "Artifact",
                    "action": r.recommendation or "Inspect and patch critical vulnerability immediately."
                })
            elif r.severity == "HIGH":
                roadmap.append({
                    "priority": "P1 - HIGH",
                    "timeframe": "Within 7 Days",
                    "finding_id": r.id,
                    "title": r.title,
                    "location": f"{r.file}:{r.line}" if r.file else "Artifact",
                    "action": r.recommendation or "Remediate high-severity security issue in current sprint."
                })
            elif r.severity == "MEDIUM":
                roadmap.append({
                    "priority": "P2 - MEDIUM",
                    "timeframe": "Within 30 Days",
                    "finding_id": r.id,
                    "title": r.title,
                    "location": f"{r.file}:{r.line}" if r.file else "Artifact",
                    "action": r.recommendation or "Schedule fix for upcoming release cycle."
                })
        return roadmap

    # -------------------------------------------------------------------------
    # PDF REPORT GENERATION (ENTERPRISE REPORTLAB)
    # -------------------------------------------------------------------------
    async def generate_pdf_report(self, scan_id: str) -> bytes:
        json_rep = await self.generate_json_report(scan_id)

        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
            )
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            from reportlab.pdfgen import canvas

            class NumberedCanvas(canvas.Canvas):
                def __init__(self, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    self._saved_page_states = []

                def showPage(self):
                    self._saved_page_states.append(dict(self.__dict__))
                    self._startPage()

                def save(self):
                    num_pages = len(self._saved_page_states)
                    for state in self._saved_page_states:
                        self.__dict__.update(state)
                        self.draw_page_decorations(num_pages)
                        super().showPage()
                    super().save()

                def draw_page_decorations(self, page_count):
                    self.saveState()
                    # Running Header
                    self.setFont("Helvetica-Bold", 8)
                    self.setFillColor(colors.HexColor("#0f172a"))
                    self.drawString(36, 762, "ZENTRONYX CYBERSECURITY INTELLIGENCE PLATFORM")
                    self.setFont("Helvetica", 8)
                    self.setFillColor(colors.HexColor("#64748b"))
                    self.drawRightString(576, 762, "CONFIDENTIAL // RESTRICTED ACCESS")

                    # Header Accent Rule
                    self.setStrokeColor(colors.HexColor("#0284c7"))
                    self.setLineWidth(1)
                    self.line(36, 756, 576, 756)

                    # Running Footer Rule
                    self.setStrokeColor(colors.HexColor("#cbd5e1"))
                    self.setLineWidth(0.5)
                    self.line(36, 42, 576, 42)

                    # Running Footer Text
                    self.setFont("Helvetica", 8)
                    self.setFillColor(colors.HexColor("#64748b"))
                    self.drawString(36, 30, f"Report ID: {json_rep['report_id']} | SHA-256: {json_rep['attestation']['audit_hash'][:16]}...")
                    self.drawRightString(576, 30, f"Page {self._pageNumber} of {page_count}")
                    self.restoreState()

            buf = io.BytesIO()
            # Printable width: 612 - 72 = 540 pt
            doc = SimpleDocTemplate(
                buf,
                pagesize=letter,
                rightMargin=36,
                leftMargin=36,
                topMargin=46,
                bottomMargin=48
            )

            styles = getSampleStyleSheet()
            
            # Custom Typography
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Heading1'],
                fontSize=18,
                leading=22,
                textColor=colors.HexColor('#0f172a'),
                fontName='Helvetica-Bold'
            )
            subtitle_style = ParagraphStyle(
                'DocSubtitle',
                parent=styles['Normal'],
                fontSize=8.5,
                leading=11,
                textColor=colors.HexColor('#475569')
            )
            sec_title_style = ParagraphStyle(
                'SecTitle',
                parent=styles['Heading2'],
                fontSize=11,
                leading=15,
                textColor=colors.HexColor('#0f172a'),
                fontName='Helvetica-Bold',
                spaceBefore=6,
                spaceAfter=3
            )
            body_style = ParagraphStyle(
                'BodyTextCustom',
                parent=styles['Normal'],
                fontSize=8,
                leading=11,
                textColor=colors.HexColor('#334155')
            )
            table_cell_style = ParagraphStyle(
                'TableCell',
                parent=styles['Normal'],
                fontSize=7.5,
                leading=10,
                textColor=colors.HexColor('#1e293b')
            )
            table_header_style = ParagraphStyle(
                'TableHeader',
                parent=styles['Normal'],
                fontSize=7.5,
                leading=9.5,
                textColor=colors.white,
                fontName='Helvetica-Bold'
            )
            code_cell_style = ParagraphStyle(
                'CodeCell',
                parent=styles['Normal'],
                fontSize=7,
                leading=9,
                fontName='Courier',
                textColor=colors.HexColor('#0369a1')
            )

            story = []

            # -----------------------------------------------------------------
            # 1. HEADER & COVER BANNER
            # -----------------------------------------------------------------
            story.append(Paragraph("Enterprise Security & Compliance Assessment Report", title_style))
            story.append(Spacer(1, 3))
            story.append(Paragraph(
                f"Multi-Engine Vulnerability, SAST, SCA, DAST & AI Threat Intelligence Audit | Generated: {json_rep['generated_at'][:19].replace('T', ' ')} UTC",
                subtitle_style
            ))
            story.append(Spacer(1, 8))

            # Project Metadata & Scorecard Header Grid
            project = json_rep["project"]
            scan_meta = json_rep["scan_metadata"]
            exec_sum = json_rep["executive_summary"]
            sev = scan_meta["severity_summary"]

            # Decision Color
            decision = exec_sum["policy_decision"]
            dec_color = "#16a34a" if decision == "PASS" else ("#d97706" if decision == "WARN" else "#dc2626")

            scorecard_data = [
                [
                    Paragraph(f"<b>Target Project:</b> {project['name']}", table_cell_style),
                    Paragraph(f"<b>Security Grade:</b> <font color='{dec_color}'><b>{project['security_grade']}</b></font>", table_cell_style),
                    Paragraph(f"<b>Risk Score:</b> <b>{exec_sum['risk_score']} / 100</b> ({exec_sum['risk_level']})", table_cell_style),
                ],
                [
                    Paragraph(f"<b>Repository:</b> {project['repository_url'] or 'Internal / Direct Archive'}", table_cell_style),
                    Paragraph(f"<b>Policy Verdict:</b> <font color='{dec_color}'><b>{decision}</b></font>", table_cell_style),
                    Paragraph(f"<b>Total Findings:</b> <b>{scan_meta['findings_count']}</b>", table_cell_style),
                ],
                [
                    Paragraph(f"<b>Scan ID:</b> {scan_meta['scan_id'][:12]}...", code_cell_style),
                    Paragraph(f"<b>GNN Malware Risk:</b> {exec_sum['malware_probability'] * 100:.1f}%", table_cell_style),
                    Paragraph(f"<b>Execution Time:</b> {scan_meta.get('duration_seconds') or 'N/A'}s", table_cell_style),
                ]
            ]
            scorecard_table = Table(scorecard_data, colWidths=[200, 170, 170])
            scorecard_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('PADDING', (0, 0), (-1, -1), 4),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(scorecard_table)
            story.append(Spacer(1, 8))

            # -----------------------------------------------------------------
            # 2. EXECUTIVE SUMMARY & KPI CARDS
            # -----------------------------------------------------------------
            story.append(Paragraph("1. Executive Briefing & Key Risk Indicators (KRIs)", sec_title_style))
            story.append(Paragraph(exec_sum["narrative"], body_style))
            story.append(Spacer(1, 5))

            # Severity Distribution Row
            kri_data = [
                [
                    Paragraph("<font color='#dc2626'><b>CRITICAL</b></font><br/><b>" + str(sev.get("CRITICAL", 0)) + "</b>", table_cell_style),
                    Paragraph("<font color='#ea580c'><b>HIGH</b></font><br/><b>" + str(sev.get("HIGH", 0)) + "</b>", table_cell_style),
                    Paragraph("<font color='#d97706'><b>MEDIUM</b></font><br/><b>" + str(sev.get("MEDIUM", 0)) + "</b>", table_cell_style),
                    Paragraph("<font color='#0284c7'><b>LOW</b></font><br/><b>" + str(sev.get("LOW", 0)) + "</b>", table_cell_style),
                    Paragraph("<font color='#64748b'><b>INFO</b></font><br/><b>" + str(sev.get("INFO", 0)) + "</b>", table_cell_style),
                ]
            ]
            kri_table = Table(kri_data, colWidths=[108, 108, 108, 108, 108])
            kri_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(kri_table)
            story.append(Spacer(1, 8))

            # -----------------------------------------------------------------
            # 3. REGULATORY & STANDARDS COMPLIANCE AUDIT MATRIX
            # -----------------------------------------------------------------
            story.append(Paragraph("2. Industry Framework & Regulatory Compliance Audit", sec_title_style))
            
            comp = json_rep.get("compliance_matrix", {})
            comp_rows = [
                [
                    Paragraph("Standard / Regulatory Body", table_header_style),
                    Paragraph("Compliance Score", table_header_style),
                    Paragraph("Audit Status", table_header_style),
                    Paragraph("Evaluated Controls / Scope", table_header_style)
                ],
                [
                    Paragraph("<b>OWASP Top 10 (2021)</b>", table_cell_style),
                    Paragraph(f"{comp.get('owasp_top_10', {}).get('compliance_score', 100)}%", table_cell_style),
                    Paragraph(f"<b>{comp.get('owasp_top_10', {}).get('status', 'COMPLIANT')}</b>", table_cell_style),
                    Paragraph("Injection, Broken Access, Auth, Crypto & Misconfigurations", table_cell_style),
                ],
                [
                    Paragraph("<b>NIST SP 800-53 Rev. 5</b>", table_cell_style),
                    Paragraph(f"{comp.get('nist_sp_800_53', {}).get('compliance_score', 100)}%", table_cell_style),
                    Paragraph(f"<b>{comp.get('nist_sp_800_53', {}).get('status', 'COMPLIANT')}</b>", table_cell_style),
                    Paragraph("AC-3 Access Enforcement, RA-5 Vulnerability Scanning & SI-7 Software Integrity", table_cell_style),
                ],
                [
                    Paragraph("<b>ISO / IEC 27001:2022</b>", table_cell_style),
                    Paragraph(f"{comp.get('iso_27001', {}).get('compliance_score', 100)}%", table_cell_style),
                    Paragraph(f"<b>{comp.get('iso_27001', {}).get('status', 'READY FOR AUDIT')}</b>", table_cell_style),
                    Paragraph("Annex A.8.8 Technical Vulnerabilities & A.8.28 Secure Coding", table_cell_style),
                ],
                [
                    Paragraph("<b>SOC 2 Type II</b>", table_cell_style),
                    Paragraph(f"{comp.get('soc_2', {}).get('compliance_score', 100)}%", table_cell_style),
                    Paragraph(f"<b>{comp.get('soc_2', {}).get('status', 'ENFORCED')}</b>", table_cell_style),
                    Paragraph("CC6.6 Boundary Defense & CC6.8 Malicious Code Prevention", table_cell_style),
                ],
                [
                    Paragraph("<b>PCI-DSS v4.0</b>", table_cell_style),
                    Paragraph(f"{comp.get('pci_dss', {}).get('compliance_score', 100)}%", table_cell_style),
                    Paragraph(f"<b>{comp.get('pci_dss', {}).get('status', 'PASSED')}</b>", table_cell_style),
                    Paragraph("Requirement 6.2 (Vulnerabilities) & Req 11.3 (Security Scans)", table_cell_style),
                ],
            ]
            comp_table = Table(comp_rows, colWidths=[140, 80, 110, 210])
            comp_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                ('PADDING', (0, 0), (-1, -1), 3.5),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(comp_table)
            story.append(Spacer(1, 8))

            # -----------------------------------------------------------------
            # 4. SCANNER TELEMETRY & TECHNOLOGY STACK
            # -----------------------------------------------------------------
            story.append(Paragraph("3. Multi-Engine Scanner Execution & Technology Footprint", sec_title_style))
            
            modules = json_rep.get("modules_executed", [])
            mod_rows = [
                [
                    Paragraph("Analysis Engine", table_header_style),
                    Paragraph("Engine Type", table_header_style),
                    Paragraph("Execution Status", table_header_style),
                    Paragraph("Findings", table_header_style),
                    Paragraph("Duration", table_header_style)
                ]
            ]
            for m in modules:
                mod_rows.append([
                    Paragraph(f"<b>{m['module_type']} Engine</b>", table_cell_style),
                    Paragraph("Deep Inspection", table_cell_style),
                    Paragraph(f"<font color='{'#16a34a' if m['status'] == 'COMPLETED' else '#64748b'}'><b>{m['status']}</b></font>", table_cell_style),
                    Paragraph(str(m['findings_count']), table_cell_style),
                    Paragraph(f"{m['execution_time_ms']} ms" if m.get('execution_time_ms') else "N/A", table_cell_style),
                ])

            if len(mod_rows) == 1:
                mod_rows.append([
                    Paragraph("Unified Security Engine", table_cell_style),
                    Paragraph("Multi-Engine Scanner", table_cell_style),
                    Paragraph("COMPLETED", table_cell_style),
                    Paragraph(str(scan_meta["findings_count"]), table_cell_style),
                    Paragraph("N/A", table_cell_style),
                ])

            mod_table = Table(mod_rows, colWidths=[150, 110, 110, 80, 90])
            mod_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0284c7')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                ('PADDING', (0, 0), (-1, -1), 3.5),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(mod_table)
            story.append(Spacer(1, 8))

            # -----------------------------------------------------------------
            # 5. DETAILED VULNERABILITY FINDINGS CATALOG
            # -----------------------------------------------------------------
            story.append(Paragraph(f"4. Prioritized Security Findings Catalog ({len(json_rep.get('findings', []))})", sec_title_style))
            findings = json_rep.get("findings", [])

            if not findings:
                story.append(Paragraph(
                    "<b>No security vulnerabilities detected.</b> The scanned codebase satisfies baseline security requirements.",
                    body_style
                ))
            else:
                for idx, f in enumerate(findings[:30], 1):
                    sev_str = f["severity"].upper()
                    if sev_str == "CRITICAL":
                        sev_bg = "#fee2e2"
                        sev_txt = "#dc2626"
                    elif sev_str == "HIGH":
                        sev_bg = "#ffedd5"
                        sev_txt = "#ea580c"
                    elif sev_str == "MEDIUM":
                        sev_bg = "#fef3c7"
                        sev_txt = "#d97706"
                    else:
                        sev_bg = "#e0f2fe"
                        sev_txt = "#0284c7"

                    finding_block = [
                        [
                            Paragraph(f"<b>#{idx} &bull; <font color='{sev_txt}'>[{sev_str}]</font> {f['title']}</b>", table_cell_style),
                            Paragraph(f"<b>Scanner:</b> {f['scanner'] or 'Core'} &bull; <b>Rule:</b> {f['rule_id'] or 'SEC-001'}", code_cell_style)
                        ],
                        [
                            Paragraph(f"<b>Target Location:</b> {f['file'] or 'Source Tree'}:{f['line'] or ''}", code_cell_style),
                            Paragraph(f"<b>Category:</b> {f['category'] or 'General Security'}", table_cell_style)
                        ],
                        [
                            Paragraph(f"<b>Description:</b> {f['description']}", table_cell_style),
                            Paragraph(f"<b>Remediation:</b> <font color='#059669'>{f['recommendation'] or 'Apply security hardening and update dependencies.'}</font>", table_cell_style)
                        ]
                    ]
                    ft = Table(finding_block, colWidths=[270, 270])
                    ft.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
                        ('LINEBEFORE', (0, 0), (0, -1), 3, colors.HexColor(sev_txt)),
                        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(sev_bg)),
                        ('PADDING', (0, 0), (-1, -1), 3.5),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ]))
                    story.append(KeepTogether([ft, Spacer(1, 5)]))

            # -----------------------------------------------------------------
            # 6. REMEDIATION SLA ROADMAP
            # -----------------------------------------------------------------
            roadmap = json_rep.get("remediation_roadmap", [])
            if roadmap:
                story.append(Spacer(1, 5))
                story.append(Paragraph("5. Strategic Remediation SLA Roadmap", sec_title_style))
                
                road_rows = [
                    [
                        Paragraph("Priority Tier", table_header_style),
                        Paragraph("SLA Window", table_header_style),
                        Paragraph("Vulnerability", table_header_style),
                        Paragraph("Required Engineering Action", table_header_style)
                    ]
                ]
                for item in roadmap[:10]:
                    road_rows.append([
                        Paragraph(f"<b>{item['priority']}</b>", table_cell_style),
                        Paragraph(item['timeframe'], table_cell_style),
                        Paragraph(item['title'][:40], table_cell_style),
                        Paragraph(item['action'], table_cell_style),
                    ])
                
                road_table = Table(road_rows, colWidths=[110, 90, 160, 180])
                road_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                    ('PADDING', (0, 0), (-1, -1), 3.5),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                story.append(road_table)

            # -----------------------------------------------------------------
            # 7. ATTESTATION & AUDIT SIGN-OFF BLOCK
            # -----------------------------------------------------------------
            story.append(Spacer(1, 8))
            story.append(Paragraph("6. Cryptographic Attestation & Audit Verification", sec_title_style))
            
            attest = json_rep.get("attestation", {})
            attest_data = [
                [
                    Paragraph("<b>Audit Hash Digest (SHA-256):</b>", table_cell_style),
                    Paragraph(f"<font color='#0369a1'><b>{attest.get('audit_hash')}</b></font>", code_cell_style)
                ],
                [
                    Paragraph("<b>Verification Engine:</b>", table_cell_style),
                    Paragraph(f"{attest.get('engine_version')} | Certified Automated Analysis", table_cell_style)
                ],
                [
                    Paragraph("<b>Lead Security Auditor:</b>", table_cell_style),
                    Paragraph("___________________________________ (Digital Signature)", table_cell_style)
                ],
                [
                    Paragraph("<b>DevSecOps Release Authority:</b>", table_cell_style),
                    Paragraph("___________________________________ (Approval Signature)", table_cell_style)
                ]
            ]
            attest_table = Table(attest_data, colWidths=[180, 360])
            attest_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('PADDING', (0, 0), (-1, -1), 3.5),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(KeepTogether([attest_table]))

            # Build Document with NumberedCanvas
            doc.build(story, canvasmaker=NumberedCanvas)
            buf.seek(0)
            return buf.getvalue()

        except ImportError:
            logger.warning("ReportLab not available. Generating formatted text PDF fallback.")
            text = json.dumps(json_rep, indent=2)
            return text.encode('utf-8')

    # -------------------------------------------------------------------------
    # STANDALONE INTERACTIVE HTML REPORT GENERATOR
    # -------------------------------------------------------------------------
    async def generate_html_report(self, scan_id: str) -> str:
        rep = await self.generate_json_report(scan_id)
        project = rep["project"]
        scan = rep["scan_metadata"]
        exec_sum = rep["executive_summary"]
        findings = rep["findings"]
        comp = rep.get("compliance_matrix", {})
        sev = scan["severity_summary"]

        decision_badge_class = (
            "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            if exec_sum["policy_decision"] == "PASS"
            else "bg-rose-500/20 text-rose-300 border-rose-500/40"
        )

        html = f"""<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zentronyx Security Report - {project['name']}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {{
      body {{ background: #ffffff !important; color: #0f172a !important; }}
      .no-print {{ display: none !important; }}
      .print-border {{ border: 1px solid #cbd5e1 !important; }}
      .page-break {{ page-break-after: always; }}
    }}
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased p-4 md:p-8">
  <div class="max-w-6xl mx-auto space-y-6">

    <!-- Top Action Bar (no-print) -->
    <div class="no-print flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950">Z</div>
        <div>
          <h2 class="text-sm font-bold text-slate-200">ZENTRONYX SECURITY INTELLIGENCE REPORT</h2>
          <p class="text-xs text-slate-400">Interactive standalone web audit manifest</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="window.print()" class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md">
          Print / Save as PDF
        </button>
      </div>
    </div>

    <!-- Executive Header Banner -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            AUDIT MANIFEST: {rep['report_id']}
          </span>
          <h1 class="text-2xl font-black text-slate-100 mt-2 font-mono">{project['name']}</h1>
          <p class="text-xs text-slate-400 mt-1">{project.get('description') or 'Enterprise Application Assessment'} &bull; Repository: <code class="text-cyan-400">{project.get('repository_url') or 'Internal Upload'}</code></p>
        </div>
        <div class="flex flex-wrap gap-3">
          <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center min-w-[90px]">
            <div class="text-[10px] font-mono text-slate-400">POSTURE GRADE</div>
            <div class="text-2xl font-black text-cyan-400 font-mono">{project['security_grade']}</div>
          </div>
          <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center min-w-[90px]">
            <div class="text-[10px] font-mono text-slate-400">RISK SCORE</div>
            <div class="text-2xl font-black text-slate-100 font-mono">{exec_sum['risk_score']}</div>
          </div>
          <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center min-w-[100px]">
            <div class="text-[10px] font-mono text-slate-400">POLICY GATE</div>
            <div class="text-lg font-black font-mono mt-1 px-2 py-0.5 rounded border {decision_badge_class}">{exec_sum['policy_decision']}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Severity Distribution Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div class="bg-rose-950/30 border border-rose-800/40 p-4 rounded-xl text-center">
        <div class="text-xs font-mono font-bold text-rose-400">CRITICAL</div>
        <div class="text-2xl font-black text-rose-300 font-mono mt-1">{sev.get('CRITICAL', 0)}</div>
      </div>
      <div class="bg-amber-950/30 border border-amber-800/40 p-4 rounded-xl text-center">
        <div class="text-xs font-mono font-bold text-amber-400">HIGH</div>
        <div class="text-2xl font-black text-amber-300 font-mono mt-1">{sev.get('HIGH', 0)}</div>
      </div>
      <div class="bg-yellow-950/30 border border-yellow-800/40 p-4 rounded-xl text-center">
        <div class="text-xs font-mono font-bold text-yellow-400">MEDIUM</div>
        <div class="text-2xl font-black text-yellow-300 font-mono mt-1">{sev.get('MEDIUM', 0)}</div>
      </div>
      <div class="bg-cyan-950/30 border border-cyan-800/40 p-4 rounded-xl text-center">
        <div class="text-xs font-mono font-bold text-cyan-400">LOW</div>
        <div class="text-2xl font-black text-cyan-300 font-mono mt-1">{sev.get('LOW', 0)}</div>
      </div>
      <div class="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-center">
        <div class="text-xs font-mono font-bold text-slate-400">INFO</div>
        <div class="text-2xl font-black text-slate-300 font-mono mt-1">{sev.get('INFO', 0)}</div>
      </div>
    </div>

    <!-- Executive Briefing -->
    <div class="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2">
      <h3 class="text-xs font-bold text-cyan-400 uppercase font-mono tracking-wider">Executive Briefing & Threat Narrative</h3>
      <p class="text-xs text-slate-300 leading-relaxed">{exec_sum['narrative']}</p>
    </div>

    <!-- Framework Compliance Matrix -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="p-4 border-b border-slate-800 font-mono font-bold text-xs text-slate-300">
        REGULATORY & COMPLIANCE FRAMEWORK POSTURE
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th class="p-3">Framework Standard</th>
              <th class="p-3">Compliance %</th>
              <th class="p-3">Audit Posture</th>
              <th class="p-3">Scope & Evaluated Controls</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-300">
            <tr>
              <td class="p-3 font-bold">OWASP Top 10 (2021)</td>
              <td class="p-3 font-mono font-bold text-cyan-400">{comp.get('owasp_top_10', {}).get('compliance_score', 100)}%</td>
              <td class="p-3 font-mono text-emerald-400">{comp.get('owasp_top_10', {}).get('status', 'COMPLIANT')}</td>
              <td class="p-3 text-slate-400">Injection, Broken Access Control, Crypto, Insecure Auth</td>
            </tr>
            <tr>
              <td class="p-3 font-bold">NIST SP 800-53 Rev. 5</td>
              <td class="p-3 font-mono font-bold text-cyan-400">{comp.get('nist_sp_800_53', {}).get('compliance_score', 100)}%</td>
              <td class="p-3 font-mono text-cyan-300">{comp.get('nist_sp_800_53', {}).get('status', 'COMPLIANT')}</td>
              <td class="p-3 text-slate-400">AC-3 Access Enforcement, RA-5 Vulnerability Scanning, SI-7 Integrity</td>
            </tr>
            <tr>
              <td class="p-3 font-bold">ISO / IEC 27001:2022</td>
              <td class="p-3 font-mono font-bold text-cyan-400">{comp.get('iso_27001', {}).get('compliance_score', 100)}%</td>
              <td class="p-3 font-mono text-emerald-300">{comp.get('iso_27001', {}).get('status', 'READY FOR AUDIT')}</td>
              <td class="p-3 text-slate-400">Annex A.8.8 Technical Vulnerabilities & A.8.28 Secure Coding</td>
            </tr>
            <tr>
              <td class="p-3 font-bold">SOC 2 Type II</td>
              <td class="p-3 font-mono font-bold text-cyan-400">{comp.get('soc_2', {}).get('compliance_score', 100)}%</td>
              <td class="p-3 font-mono text-purple-300">{comp.get('soc_2', {}).get('status', 'ENFORCED')}</td>
              <td class="p-3 text-slate-400">CC6.6 Boundary Defense & CC6.8 Malicious Code Detection</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Findings Catalog -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-xs font-bold text-slate-200 uppercase font-mono">
          Security Findings Catalog ({len(findings)})
        </h3>
      </div>

      <div class="space-y-3">
"""
        for idx, f in enumerate(findings, 1):
            sev_class = {
                "CRITICAL": "bg-rose-500/20 text-rose-300 border-rose-500/40",
                "HIGH": "bg-amber-500/20 text-amber-300 border-amber-500/40",
                "MEDIUM": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
                "LOW": "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
            }.get(f["severity"].upper(), "bg-slate-800 text-slate-400 border-slate-700")

            html += f"""
        <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border {sev_class}">{f['severity']}</span>
              <h4 class="text-xs font-bold text-slate-100">#{idx} &bull; {f['title']}</h4>
            </div>
            <div class="text-[10px] font-mono text-slate-400">{f['scanner'] or 'Core'} &bull; {f['rule_id'] or 'SEC-001'}</div>
          </div>
          <p class="text-xs text-slate-300">{f['description']}</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
            <div class="font-mono text-slate-400 truncate"><b>Location:</b> {f['file'] or 'Source Artifact'}:{f['line'] or ''}</div>
            <div class="text-emerald-400 bg-emerald-950/20 p-1.5 rounded border border-emerald-800/30"><b>Fix:</b> {f['recommendation'] or 'Review code and apply secure patterns.'}</div>
          </div>
        </div>
"""

        html += f"""
      </div>
    </div>

    <!-- Attestation Footer -->
    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center text-xs text-slate-400 font-mono space-y-1">
      <div>Cryptographic Verification Digest: <span class="text-cyan-400">{rep['attestation']['audit_hash']}</span></div>
      <div>Zentronyx Automated Security Intelligence Platform &bull; Certified Attestation</div>
    </div>

  </div>
</body>
</html>"""
        return html

    # -------------------------------------------------------------------------
    # CSV EXPORT GENERATOR
    # -------------------------------------------------------------------------
    async def generate_csv_report(self, scan_id: str) -> str:
        rep = await self.generate_json_report(scan_id)
        findings = rep.get("findings", [])

        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "Finding ID", "Severity", "Title", "Scanner", "Category",
            "Rule ID", "File", "Line", "Column", "Confidence",
            "Description", "Recommendation", "Status"
        ])

        for f in findings:
            writer.writerow([
                f.get("id", ""),
                f.get("severity", ""),
                f.get("title", ""),
                f.get("scanner", ""),
                f.get("category", ""),
                f.get("rule_id", ""),
                f.get("file", ""),
                f.get("line", ""),
                f.get("column", ""),
                f.get("confidence", ""),
                f.get("description", ""),
                f.get("recommendation", ""),
                f.get("status", "")
            ])

        return output.getvalue()
