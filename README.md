# Zentronyx — Automated Software Security & GNN Malware Analysis Platform

[![Build & Test](https://github.com/zentronyx/zentronyx/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/zentronyx/zentronyx/actions/workflows/ci-cd.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18-cyan.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)

Zentronyx is an enterprise-grade automated software security, vulnerability scanning, and Graph Neural Network (GNN) malware analysis platform.

---

## 🌟 Key Platform Features

- **Multi-Source Ingestion**: Secure ZIP upload (Zip Slip protected) & SSRF-hardened GitHub repository acquisition.
- **Read-Only Project Analysis Engine**: Safe static detection of 7 languages, 12 frameworks, 8 build systems, dependency manifests, and entry points.
- **Async Scan Orchestration**: Concurrent execution of SAST, SCA, DAST, Binary Analysis, and GNN modules with failure isolation.
- **Production Scanner Toolchain**:
  - **SAST**: Semgrep static code analysis.
  - **SCA**: OSV-Scanner dependency vulnerability analysis against Open Source Vulnerability DB.
  - **DAST**: OWASP ZAP baseline scanner with strict SSRF Target Protection.
  - **Binary Hardening**: Static PE & ELF compilation mitigation inspection (Stack Canary, NX/DEP, PIE/ASLR, RelRO).
  - **GNN Malware Classifier**: Standalone AI microservice running PyTorch / PyG Graph Convolutional Networks over structural Code Property Graphs.
- **Transparent Risk Engine**: Non-blackbox weighted risk scoring formula mapped to `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- **Configurable Policy Engine Gate**: Automatic CI/CD pipeline policy decision (`PASS`, `WARN`, `BLOCK`).
- **Unified Security Dashboard & Reporting**: Modern React dashboard, SHA-256 finding deduplication, JSON reports, and styled PDF downloads.

---

## 🏗 System Architecture

```
                                SCAN ORCHESTRATOR
                                       │
         ┌──────────────┬──────────────┼──────────────┬──────────────┐
         ▼              ▼              ▼              ▼              ▼
     SAST Module    SCA Module     DAST Module    Binary Module   GNN Module
     (Semgrep)     (OSV-Scanner)   (OWASP ZAP)    (Hardening)     (AI Service)
         │              │              │              │              │
         └──────────────┴──────────────┼──────────────┴──────────────┘
                                       │
                                       ▼
                       Result Aggregator & SHA-256 Dedup
                                       │
                                       ▼
                      Risk Engine & Policy Gate (PASS/BLOCK)
                                       │
                                       ▼
                         Unified Reports (JSON & PDF)
```

---

## 🚀 Quickstart & Installation

### Option 1: Docker Compose (Recommended)
```bash
# Clone repository
git clone https://github.com/zentronyx/zentronyx.git
cd zentronyx

# Start all services (PostgreSQL, Backend Engine, AI Microservice, Frontend)
docker-compose up --build -d
```
- **Frontend Dashboard**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **AI Microservice Health**: http://localhost:8001/health

### Option 2: Local Development Setup

#### Backend Engine:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m pytest
uvicorn main:app --reload --port 8000
```

#### AI Microservice:
```bash
cd ai-service
pip install -r requirements.txt
python -m pytest
uvicorn app.main:app --reload --port 8001
```

#### Frontend Dashboard:
```bash
cd frontend
npm install
npm run dev
```

---

## 🛡 Security & Compliance Controls

1. **Zero Code Execution**: Analyzed binaries and user source targets are **NEVER EXECUTED**.
2. **SSRF Target Protection**: DAST scanning is strictly limited to `localhost`, `127.0.0.1`, loopback/private IP ranges, or approved internal container endpoints.
3. **Subprocess Isolation**: Commands run via `ProcessExecutor` without `shell=True`.
4. **HMAC Webhook Signatures**: GitHub webhooks validate `X-Hub-Signature-256` HMAC signatures.

---

## 📄 License
Licensed under the Apache License, Version 2.0.
