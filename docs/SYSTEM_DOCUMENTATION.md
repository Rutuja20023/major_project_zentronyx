# Zentronyx — Master Security Platform Architecture & System Documentation

## 1. Executive Summary
Zentronyx is an end-to-end Automated Software Security & Binary Malware Analysis Platform. It unifies Static Application Security Testing (SAST via Semgrep), Software Composition Analysis (SCA via OSV-Scanner), Dynamic Application Security Testing (DAST via OWASP ZAP), Static Binary Compilation Hardening, and Graph Neural Network (GNN) Malware Analysis into a single automated pipeline.

---

## 2. Comprehensive Directory Tree

```
Zentronyx/
├── .github/workflows/
│   └── ci-cd.yml                     # GitHub Actions Automated CI/CD Pipeline
├── ai-service/                        # Standalone GNN AI Microservice
│   ├── app/
│   │   ├── main.py                   # FastAPI microservice (GET /health, POST /predict-malware)
│   │   ├── models/gnn_model.py       # PyTorch / PyG Graph Convolutional Network Model
│   │   └── schemas/predict.py        # Pydantic Request/Response schemas
│   ├── training/
│   │   ├── dataset_builder.py        # Dataset benchmark generation & splitting pipeline
│   │   ├── train_gnn.py              # Model training & metrics evaluation script
│   │   └── DATASET_SPECIFICATION.md  # Dataset documentation & class distribution
│   └── tests/
│       └── test_ai_service.py        # AI Microservice test suite
├── backend/                           # Main Zentronyx FastAPI Platform Engine
│   ├── alembic/versions/             # Database Migrations (001 - 004)
│   ├── app/
│   │   ├── api/v1/endpoints/         # API Endpoint Routers
│   │   │   ├── analysis.py           # Project Analysis Endpoints
│   │   │   ├── audit.py              # Security Audit Logging Endpoints
│   │   │   ├── auth.py               # JWT Authentication Endpoints
│   │   │   ├── health.py             # System Health Endpoints
│   │   │   ├── policies.py           # Security Policy Engine Endpoints
│   │   │   ├── projects.py           # Project Management Endpoints
│   │   │   ├── reports.py            # Unified JSON & PDF Reports Endpoints
│   │   │   ├── scans.py              # Scan Orchestrator Endpoints
│   │   │   ├── sources.py            # ZIP & GitHub Source Ingestion Endpoints
│   │   │   └── webhooks.py           # GitHub Webhook Integration & Signature Verification
│   │   ├── analyzers/                # Project Analysis Engine & Detectors
│   │   │   ├── binary_extractor.py   # Static Binary Feature Extractor (ELF / PE)
│   │   │   ├── graph_builder.py      # Code Property Graph (CPG) Representation Builder
│   │   │   ├── language_detector.py # Multi-language Detector
│   │   │   └── engine.py             # Read-Only Project Analysis Engine
│   │   ├── core/
│   │   │   ├── config.py             # Centralized System Settings & Scanner Configs
│   │   │   ├── process_executor.py   # Safe Subprocess Abstraction (No shell=True)
│   │   │   ├── risk_engine.py        # Formulaic Risk Scoring Engine
│   │   │   └── policy_engine.py      # Configurable Security Policy Gate Engine
│   │   ├── models/                   # SQLAlchemy Database Models
│   │   │   ├── analysis.py           # ProjectAnalysis Model
│   │   │   ├── audit.py              # AuditLog Model
│   │   │   ├── policy.py             # SecurityPolicy & PolicyEvaluation Models
│   │   │   ├── project.py            # Project Model
│   │   │   ├── scan.py               # Scan, ScanModule & ScanResult Models
│   │   │   ├── source.py             # Source Target Model
│   │   │   └── user.py               # User Model
│   │   ├── orchestrator/             # Scan Orchestration Engine
│   │   │   ├── aggregator.py         # Result Aggregator & SHA-256 Deduplicator
│   │   │   ├── engine.py             # Async Multi-module Scan Orchestrator
│   │   │   └── planner.py            # Automated Scan Planner Engine
│   │   └── scanners/                 # Security Module Scanner Adapters
│   │       ├── semgrep_sast.py       # Semgrep SAST Adapter
│   │       ├── osv_sca.py            # OSV-Scanner SCA Adapter
│   │       ├── owasp_zap_dast.py     # OWASP ZAP DAST Adapter (SSRF Protected)
│   │       ├── binary_analysis.py    # Binary Compilation Hardening Adapter
│   │       ├── gnn_malware.py        # GNN AI Malware Classifier Adapter
│   │       └── registry.py           # Security Module Registry Singleton
│   └── tests/                        # Backend Pytest Test Suite (37 Tests)
├── frontend/                          # Vite + React + TypeScript Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/SecurityDashboard.tsx
│   │   │   ├── findings/FindingExplorer.tsx
│   │   │   ├── projects/TechnologyAnalysisCard.tsx
│   │   │   └── scans/ScanProgressCard.tsx, ScanPlanModal.tsx, ScanComparisonModal.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx, ProjectsList.tsx, ProjectDetails.tsx, Login.tsx, Register.tsx
│   │   └── services/
│   │       ├── api.ts, auth.service.ts, project.service.ts, scan.service.ts, report.service.ts, policy.service.ts
└── docker-compose.yml                 # Multi-container Deployment Specification
```

---

## 3. Transparent Risk Engine Formula
$$\text{Score} = \min\left(100.0, \; 30 \times N_{\text{crit}} + 15 \times N_{\text{high}} + 5 \times N_{\text{med}} + 1 \times N_{\text{low}} + 25 \times P_{\text{malware}} + 20 \times N_{\text{dast\_crit}}\right)$$

- **Level Rappings**:
  - $\ge 75.0 \rightarrow \text{CRITICAL}$
  - $\ge 50.0 \rightarrow \text{HIGH}$
  - $\ge 25.0 \rightarrow \text{MEDIUM}$
  - $< 25.0 \rightarrow \text{LOW}$

---

## 4. Configurable Policy Engine Rules
1. **`BLOCK`**:
   - Critical vulnerability count $> 0$
   - High vulnerability count $> 3$
   - GNN Malware Probability $> 0.70$
   - Critical DAST finding $> 0$
   - Critical SCA CVE $> 0$
2. **`WARN`**: High vulnerabilities $> 0$ or Medium vulnerabilities $> 5$.
3. **`PASS`**: All security thresholds met.

---

## 5. Security & SSRF Controls
- **Zero Execution**: Analyzed binaries and user source targets are **NEVER EXECUTED**.
- **SSRF Protection Guard**: DAST target URLs are validated to `localhost`, `127.0.0.1`, loopback/private IP ranges, or approved internal containers. Arbitrary external public domains are strictly rejected (`ValueError`).
- **Zip Slip & Path Traversal Guard**: Archive extractions validate canonical target paths to prevent directory traversal.
- **Process Isolation**: All subprocess commands run via `ProcessExecutor` without `shell=True`.
- **HMAC Signature Verification**: GitHub webhooks validate `X-Hub-Signature-256` HMAC signatures.

---

## 6. End-to-End Test Suite Summary
- **Backend Test Suite**: **37/37 Pytest tests passing** in 5.42s.
- **AI Microservice Test Suite**: **2/2 Pytest tests passing** in 0.58s.
- **Frontend Bundle**: Vite production build compiled with 0 errors.
