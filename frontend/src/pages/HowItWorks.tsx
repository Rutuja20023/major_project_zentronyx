import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Code2,
  Package,
  Globe,
  Binary,
  Layers,
  CheckCircle2,
  ArrowRight,
  Lock,
  UploadCloud,
  Sparkles,
  Activity,
  Award,
  Shield,
  Network,
  FolderGit2,
  FileCheck,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ZentronyxLogo } from '../components/common/ZentronyxLogo';
import { MovingVideoBackground } from '../components/common/MovingVideoBackground';

export const HowItWorks: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState<number>(0);
  const [selectedDemoTarget, setSelectedDemoTarget] = useState<'python_web' | 'native_elf' | 'node_api'>('python_web');

  const pipelineStages = [
    {
      id: 0,
      number: '01',
      title: 'Project Creation',
      subtitle: 'Isolated Security Workspace',
      shortDesc: 'User initializes an immutable project workspace as the central hub for source, scan telemetry, findings, and compliance audits.',
      icon: FolderGit2,
      color: 'cyan',
      details: [
        'Each project receives a cryptographically secure UUID workspace identifier.',
        'Maintains complete historical timeline of scans, findings, and policy approvals.',
        'Enforces multi-tenant isolation where each repository runs in a separate directory boundary.',
        'Serves as the root anchor for CI/CD webhook integrations and automated scans.',
      ],
      codeSnippet: `POST /api/v1/projects
{
  "name": "payments-microservice",
  "description": "Critical checkout and transaction processor",
  "repository_url": "https://github.com/zentronyx/payments"
}`,
    },
    {
      id: 1,
      number: '02',
      title: 'Source Ingestion',
      subtitle: 'ZIP Archive or GitHub OAuth',
      shortDesc: 'Acquires project code via secure ZIP upload with Zip Slip path-traversal prevention or SSRF-hardened GitHub branch cloning.',
      icon: UploadCloud,
      color: 'emerald',
      details: [
        'ZIP Upload: Enforces strict canonical path checks (Zip Slip defense) preventing directory traversal attacks.',
        'GitHub Integration: Fetches specific commit hashes over OAuth/PAT with HMAC-SHA256 webhook validation.',
        'Untrusted Input Quarantine: Ingested source files are strictly treated as untrusted data.',
        'SHA-256 Ingestion Fingerprint: Every ingested artifact is hashed to ensure tamper-proof audit trails.',
      ],
      codeSnippet: `POST /api/v1/projects/{project_id}/source/zip
Content-Type: multipart/form-data; boundary=----Zentronyx
[Binary Payload: archive.zip (SHA-256: 9f86d081884...)]

[+] ZipSlip Mitigation: Verified 142 files within sandbox boundary.
[+] Fingerprint Recorded: sha256_9f86d081884c7d659a2feaa0c55ad015`,
    },
    {
      id: 2,
      number: '03',
      title: 'Project Technology Analysis',
      subtitle: 'Static Language & Ecosystem Detection',
      shortDesc: 'Non-executing structural analyzer detects languages, frameworks, dependency manifests, build systems, and binary capabilities.',
      icon: Layers,
      color: 'blue',
      details: [
        'Language Identification: Heuristic & extension detection for Python, TS/JS, Java, Go, Rust, C/C++, and ELF/PE.',
        'Framework Detection: Identifies FastAPI, Django, Express, React, Spring Boot, Gin, etc.',
        'Manifest Parsing: Locates requirements.txt, package.json, pom.xml, go.mod, Cargo.toml.',
        'Binary & Web Surface Discovery: Identifies compiled executables and live endpoint configurations for targeted scanning.',
      ],
      codeSnippet: `[+] Technology Inspector Results:
- Primary Languages: Python 3.12 (82%), C++ (18%)
- Framework: FastAPI / Uvicorn ASGI
- Dependency Manifest: requirements.txt (24 packages)
- Build System: CMakeLists.txt & Makefile
- Binary Artifacts: build/libcrypto_engine.so (ELF64)`,
    },
    {
      id: 3,
      number: '04',
      title: 'Scan Orchestration',
      subtitle: 'Async Parallel Scanner Dispatch',
      shortDesc: 'Asynchronous workflow engine launches SAST, SCA, DAST, Binary Hardening, and GNN AI models in parallel with strict timeout guards.',
      icon: Activity,
      color: 'purple',
      details: [
        'Parallel Engine Dispatch: Runs static code, dependency, runtime, and AI models concurrently without blocking.',
        'Subprocess Sandboxing: Executes toolchains via sanitized arguments without shell invocation (shell=False).',
        'Failure Isolation: If a single engine times out or encounters invalid syntax, other scanners continue unaffected.',
        'Zero Execution Guarantee: Source code and binaries are statically audited—NEVER executed dynamically.',
      ],
      codeSnippet: `[+] Orchestrating Parallel Scan Job: scan_job_8841a
├─ [SAST Worker]   -> Semgrep Engine (Rules: owasp-top10, cwe-top25)
├─ [SCA Worker]    -> OSV-Scanner (Ecosystem: PyPI, npm)
├─ [DAST Worker]   -> OWASP ZAP (Target: localhost:8000, SSRF-Guarded)
├─ [Binary Worker] -> ELF/PE Mitigation & Entropy Auditor
└─ [GNN AI Worker] -> PyTorch CPG Malware Inference Microservice`,
    },
    {
      id: 4,
      number: '05',
      title: 'Security Scanning Engines',
      subtitle: '5 Multi-Vector Analysis Modules',
      shortDesc: 'Five specialized analysis engines inspect the project from source code patterns to dependency vulnerabilities and graph malware anomalies.',
      icon: Shield,
      color: 'cyan',
      details: [
        'SAST (Semgrep): Deep AST pattern matching for injection flaws, secret exposures, and improper access controls.',
        'SCA (OSV-Scanner): Cross-references package manifests with the real-time Open Source Vulnerability (OSV.dev) database.',
        'DAST (OWASP ZAP): Performs baseline HTTP checks against controlled local endpoints with strict loopback guards.',
        'Binary Hardening: Audits ELF & PE binaries for Stack Canaries, NX/DEP, PIE/ASLR, and high-entropy packed sections.',
        'GNN AI Classifier: PyTorch Geometric GNN evaluates structural Code Property Graphs (CPGs) for malicious control flow patterns.',
      ],
      codeSnippet: `[+] Scanner Execution Telemetry:
- SAST: 2,410 rules evaluated in 3.12s -> 1 High (CWE-89 SQLi)
- SCA: 24 packages resolved -> 0 Critical, 1 Medium (CVE-2023-46136)
- DAST: Probed HTTP responses -> Missing Content-Security-Policy (CSP)
- Binary: ELF64 libcrypto_engine.so -> Canary ENABLED, NX ENABLED, PIE ENABLED
- GNN AI: Graph nodes: 384, Edges: 890 -> Classification: BENIGN (96.4% confidence)`,
    },
    {
      id: 5,
      number: '06',
      title: 'Result Aggregation',
      subtitle: 'SHA-256 Finding Deduplication',
      shortDesc: 'Aggregates findings from all 5 engines into a unified schema, deduplicating repetitive issues via SHA-256 fingerprint signatures.',
      icon: Network,
      color: 'amber',
      details: [
        'Unified Finding Schema: Normalizes scanner-specific outputs into a standard vulnerability format.',
        'Cryptographic Deduplication: Generates SHA-256 finding signatures based on file path, rule ID, and line number.',
        'CWE & CVE Taxonomy: Maps all identified issues directly to standardized CWE weakness enumerations.',
        'Fix Guidance & Line Context: Attaches precise line snippets, remediation guidance, and patch version targets.',
      ],
      codeSnippet: `[+] Result Aggregator Contract:
{
  "finding_id": "sha256:d8b2e1a49f...",
  "engine": "SAST_SEMGREP",
  "rule_id": "python.fastapi.security.sql-injection",
  "cwe": "CWE-89",
  "severity": "HIGH",
  "file_path": "app/api/v1/endpoints/users.py",
  "line_number": 42,
  "recommendation": "Use parameterized SQLAlchemy queries instead of raw string formatting."
}`,
    },
    {
      id: 6,
      number: '07',
      title: 'Risk Scoring Engine',
      subtitle: 'Transparent Mathematical Posture',
      shortDesc: 'Calculates an explainable 0-100 risk score and security posture based on severity weights, avoiding opaque black-box scoring.',
      icon: Award,
      color: 'rose',
      details: [
        'Weighted Mathematical Formula: Raw Risk = (10 × Critical) + (5 × High) + (2 × Medium) + (0.5 × Low).',
        'Bounded Normalization: Final Risk Score = min(100, Raw Risk) & Security Posture = 100 - Risk Score.',
        'Risk Category Mapping: Categorized as CRITICAL (>= 75), HIGH (50-74), MEDIUM (25-49), or LOW (< 25).',
        'Transparent Auditability: Every risk score can be traced directly back to individual verified findings.',
      ],
      codeSnippet: `[+] Risk Calculation Engine:
- Findings: 0 Critical (0×10) + 1 High (1×5) + 2 Medium (2×2) + 1 Low (1×0.5)
- Raw Risk Sum: 5 + 4 + 0.5 = 9.5
- Normalized Risk Score: 9.5 / 100
- Security Posture Score: 90.5 / 100 (LOW RISK STATUS)`,
    },
    {
      id: 7,
      number: '08',
      title: 'Policy Gate & Audit Report',
      subtitle: 'CI/CD Pass/Block & PDF Reports',
      shortDesc: 'Evaluates enterprise policy rules (PASS / WARN / BLOCK) and generates downloadable audit-ready PDF and JSON compliance reports.',
      icon: FileCheck,
      color: 'emerald',
      details: [
        'Automated CI/CD Policy Gate: Evaluates compliance thresholds to determine if the commit can safely proceed.',
        'Configurable Policy Rules: Set blocking thresholds (e.g. Block on any Critical or High SAST flaw).',
        'Audit-Ready PDF Export: Generates professional multi-page security compliance reports for auditors.',
        'REST API & Webhooks: Delivers JSON telemetry directly into Jenkins, GitHub Actions, and GitLab CI.',
      ],
      codeSnippet: `[+] Policy Evaluation Result:
- Policy Name: "Enterprise Strict Production Gate"
- Rule 1 (No Critical Findings): PASSED (0 Critical)
- Rule 2 (Max High Findings <= 2): PASSED (1 High detected)
- Final Gate Decision: ALLOW (CI/CD Pipeline Can Proceed)
- Audit Reports Generated:
  * report_payments_scan_8841a.json (REST API Contract)
  * report_payments_scan_8841a.pdf (Executive Compliance Document)`,
    },
  ];

  const demoScenarios = {
    python_web: {
      name: 'Python FastAPI Web Service',
      badge: 'SAST + SCA + DAST + GNN',
      input: 'archive_payments_api.zip',
      analysis: 'Python 3.12, FastAPI, requirements.txt, 14 REST endpoints',
      sast: '1 High Severity (Raw SQL concatenation in query builder)',
      sca: '1 Medium CVE in pyjwt < 2.4.0 (Fixed in 2.8.0)',
      dast: 'Missing X-Content-Type-Options & Content-Security-Policy headers',
      binary: 'No compiled ELF/PE binaries detected in repository',
      gnn: 'AST Control Flow Graph classified: BENIGN (98.2% confidence)',
      risk: '12.5 / 100 (LOW)',
      decision: 'PASS',
    },
    native_elf: {
      name: 'C/C++ Cryptographic Kernel Module',
      badge: 'SAST + Binary Hardening + GNN AI',
      input: 'crypto_native_elf.tar.gz',
      analysis: 'C/C++17, CMake, Makefile, libcrypto.so (ELF64)',
      sast: '0 High / Critical (Clean bounded memory access)',
      sca: '0 Open source package vulnerabilities detected',
      dast: 'DAST skipped (Non-HTTP daemon / native shared library)',
      binary: 'Stack Canary: YES | NX: YES | PIE: YES | Entropy: 6.2 (Unpacked)',
      gnn: 'Code Property Graph (CPG) Evaluated: BENIGN (94.1% confidence)',
      risk: '3.0 / 100 (LOW)',
      decision: 'PASS',
    },
    node_api: {
      name: 'Node.js Express E-Commerce Microservice',
      badge: 'SAST + SCA + DAST',
      input: 'GitHub repo: zentronyx/shop-backend (branch: main)',
      analysis: 'TypeScript 5.3, Express 4.18, package-lock.json, 68 npm modules',
      sast: '2 High Severity (Hardcoded JWT secret token in config.ts)',
      sca: '1 Critical CVE in jsonwebtoken < 9.0.0 (CVE-2022-23529)',
      dast: 'Server banner leaked: Express/4.18.2 in response header',
      binary: 'No binary assets present',
      gnn: 'Graph classification: BENIGN (95.7% confidence)',
      risk: '68.0 / 100 (HIGH)',
      decision: 'BLOCK',
    },
  };

  const currentStage = pipelineStages[activeStage];

  return (
    <div className="relative min-h-screen text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Background */}
      <MovingVideoBackground />

      <div className="relative z-10">
        {/* Sticky Top Navigation */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050914]/85 border-b border-cyan-500/15">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Zentronyx Brand Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <ZentronyxLogo size="sm" showText={true} />
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
              <Link to="/" className="hover:text-cyan-400 transition-colors">
                Home
              </Link>
              <Link to="/#explore" className="hover:text-cyan-400 transition-colors">
                Explore Platform
              </Link>
              <Link
                to="/how-it-works"
                className="text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-0.5"
              >
                How It Works
              </Link>
              <Link to="/#scanners" className="hover:text-cyan-400 transition-colors">
                Security Scans
              </Link>
              <Link to="/#architecture" className="hover:text-cyan-400 transition-colors">
                Architecture
              </Link>
            </nav>

            {/* Auth Actions */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center space-x-2"
                >
                  <Activity className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center space-x-1.5"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Hero */}
        <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>PLATFORM ARCHITECTURE & PIPELINE WORKFLOW SPECIFICATION</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl mx-auto leading-tight text-slate-100">
            How Zentronyx{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Secures Your Software
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Zentronyx accepts projects through secure ZIP archives or GitHub OAuth integrations, normalizes workspaces, conducts static technology detection, orchestrates 5 multi-vector security engines, and calculates transparent risk decisions.
          </p>

          {/* High-Level Pipeline Flow Breadcrumb */}
          <div className="mt-12 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl max-w-5xl mx-auto overflow-x-auto">
            <div className="flex items-center justify-between min-w-[760px] text-xs font-mono">
              {[
                { label: 'USER', icon: Lock },
                { label: 'PROJECT', icon: FolderGit2 },
                { label: 'SOURCE ACQUISITION', icon: UploadCloud },
                { label: 'PROJECT ANALYSIS', icon: Layers },
                { label: 'SECURITY SCANS', icon: Shield },
                { label: 'RESULT AGGREGATION', icon: Network },
                { label: 'RISK ANALYSIS', icon: Award },
                { label: 'AUDIT REPORT', icon: FileCheck },
              ].map((step, idx, arr) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={idx}>
                    <div className="flex flex-col items-center space-y-1 group">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-slate-300 font-semibold">{step.label}</span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="h-0.5 flex-1 mx-2 bg-gradient-to-r from-cyan-500/40 via-blue-500/40 to-cyan-500/40" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>

        {/* Interactive 8-Stage Pipeline Explorer */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              STEP-BY-STEP DEEP DIVE
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-100">
              The 8 Execution Phases of Zentronyx
            </h3>
            <p className="text-sm text-slate-400 mt-2">
              Select any stage below to inspect its execution contracts, sandboxing rules, and scanner engine telemetry.
            </p>
          </div>

          {/* Stage Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-8">
            {pipelineStages.map((stage, idx) => {
              const Icon = stage.icon;
              const isSelected = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(idx)}
                  className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">{stage.number}</span>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`} />
                  </div>
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                    {stage.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Active Stage Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur-xl shadow-2xl shadow-cyan-950/40 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                  STAGE {currentStage.number} &bull; {currentStage.subtitle.toUpperCase()}
                </span>
              </div>

              <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                {currentStage.title}
              </h4>

              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                {currentStage.shortDesc}
              </p>

              {/* Bullet Details */}
              <div className="space-y-3 pt-2">
                {currentStage.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{detail}</span>
                  </div>
                ))}
              </div>

              {/* Navigation between steps */}
              <div className="flex items-center space-x-4 pt-4">
                <button
                  disabled={activeStage === 0}
                  onClick={() => setActiveStage((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-mono text-slate-200 transition-colors"
                >
                  &larr; Previous Stage
                </button>
                <button
                  disabled={activeStage === pipelineStages.length - 1}
                  onClick={() => setActiveStage((prev) => Math.min(pipelineStages.length - 1, prev + 1))}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-xs font-mono text-slate-950 font-bold transition-colors flex items-center space-x-1"
                >
                  <span>Next Stage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Code / Telemetry Inspector Box */}
            <div className="lg:col-span-5 rounded-2xl bg-slate-950/90 border border-slate-800 p-5 space-y-4 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] text-slate-400 ml-1">contract_payload.log</span>
                </div>
                <span className="text-[10px] text-cyan-400">TELEMETRY</span>
              </div>

              <pre className="text-[11px] leading-relaxed text-slate-300 overflow-x-auto p-2 bg-slate-900/50 rounded-lg border border-slate-900">
                {currentStage.codeSnippet}
              </pre>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Deterministic REST Contract</span>
                <span className="text-emerald-400">STATUS 200 OK</span>
              </div>
            </div>
          </div>
        </section>

        {/* Five Security Engines Deep Dive */}
        <section id="engines" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              SECURITY TOOLCHAIN & METHODOLOGIES
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Inside the 5 Analysis Engines
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              Zentronyx couples battle-tested open-source security toolchains with proprietary Graph Neural Network malware representations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. SAST */}
            <div className="p-7 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Code2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-cyan-500/15 text-cyan-300">
                  SEMGREP ENGINE
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-100">Static Application Security Testing (SAST)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Parses source code into Abstract Syntax Trees (ASTs) to detect hardcoded secrets, SQL injection flaws, command injection, path traversals, and cryptographic weakness without compiling or running code.
              </p>
              <div className="pt-2 text-[11px] font-mono text-slate-300 space-y-1.5 border-t border-slate-800">
                <div>&bull; Rules: OWASP Top 10 & CWE Top 25</div>
                <div>&bull; AST traversal without compilation</div>
                <div>&bull; Exact file, line, and column attribution</div>
              </div>
            </div>

            {/* 2. SCA */}
            <div className="p-7 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Package className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-emerald-500/15 text-emerald-300">
                  OSV-SCANNER
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-100">Software Composition Analysis (SCA)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scans dependency manifests (requirements.txt, package-lock.json, pom.xml, Cargo.lock) against Google's Open Source Vulnerability (OSV.dev) database to identify known CVEs and fixed remediation versions.
              </p>
              <div className="pt-2 text-[11px] font-mono text-slate-300 space-y-1.5 border-t border-slate-800">
                <div>&bull; Real-time OSV.dev CVE synchronizer</div>
                <div>&bull; PyPI, npm, Maven, Go, Cargo ecosystems</div>
                <div>&bull; Automated fixed-version suggestions</div>
              </div>
            </div>

            {/* 3. DAST */}
            <div className="p-7 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-300">
                  OWASP ZAP
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-100">Dynamic Application Security Testing (DAST)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conducts automated baseline probing against running local endpoints. Validates critical HTTP headers (CSP, HSTS, X-Frame-Options) with strict SSRF-safe loopback protection to prevent arbitrary network egress.
              </p>
              <div className="pt-2 text-[11px] font-mono text-slate-300 space-y-1.5 border-t border-slate-800">
                <div>&bull; SSRF-safe localhost/container restriction</div>
                <div>&bull; Security headers & MIME-sniffing checks</div>
                <div>&bull; Zero-impact baseline scanning</div>
              </div>
            </div>

            {/* 4. Binary Hardening */}
            <div className="p-7 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                  <Binary className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-blue-500/15 text-blue-300">
                  STATIC ELF/PE
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-100">Binary Hardening & Mitigation Inspection</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Statically inspects Linux ELF and Windows PE executable headers. Verifies compiler exploit defenses including Stack Canaries, NX/DEP memory execution flags, PIE/ASLR, and computes Shannon entropy for packers.
              </p>
              <div className="pt-2 text-[11px] font-mono text-slate-300 space-y-1.5 border-t border-slate-800">
                <div>&bull; 100% static inspection (NEVER executed)</div>
                <div>&bull; Stack Canary & NX/DEP validation</div>
                <div>&bull; Shannon entropy packing detection</div>
              </div>
            </div>

            {/* 5. GNN AI Malware Classifier */}
            <div className="p-7 rounded-2xl bg-slate-900/60 border border-purple-500/30 hover:border-purple-400 transition-all space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-purple-500/15 text-purple-300">
                  PYTORCH GNN ENGINE
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-100">AI / Graph Neural Network (GNN) Binary Classifier</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                A specialized deep learning microservice that converts binary control flow and syntax structures into structural Code Property Graphs (CPGs). Uses Graph Convolutional Networks (GCN) to evaluate structural malware topology patterns.
              </p>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div>
                  <strong className="text-cyan-300 block mb-0.5">Model Architecture:</strong>
                  Multi-layer Graph Convolutional Network (GCN) with degree-weighted pooling.
                </div>
                <div>
                  <strong className="text-emerald-300 block mb-0.5">Technical Bounds:</strong>
                  Evaluates structural graph representations of supported binaries; provides probabilistic anomaly scoring.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Scenario Simulator */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              LIVE PIPELINE SIMULATOR
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-100">
              Simulate Scan Execution Across Project Types
            </h3>
            <p className="text-sm text-slate-400 mt-2">
              See how different project ecosystems are analyzed, aggregated, and evaluated against policy gates.
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {(Object.keys(demoScenarios) as Array<keyof typeof demoScenarios>).map((key) => {
              const scenario = demoScenarios[key];
              const isSelected = selectedDemoTarget === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDemoTarget(key)}
                  className={`px-5 py-3 rounded-xl text-xs font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-105'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{scenario.name}</span>
                </button>
              );
            })}
          </div>

          {/* Simulator Display Card */}
          {(() => {
            const sc = demoScenarios[selectedDemoTarget];
            return (
              <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-100">{sc.name}</h4>
                    <span className="text-xs font-mono text-cyan-400">{sc.badge}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono text-slate-400">Risk Score:</span>
                    <span
                      className={`font-mono font-bold px-3 py-1 rounded-full text-xs border ${
                        sc.decision === 'PASS'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {sc.risk}
                    </span>
                    <span
                      className={`font-mono font-bold px-3 py-1 rounded text-xs ${
                        sc.decision === 'PASS' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
                      }`}
                    >
                      GATE: {sc.decision}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 font-mono">Source Ingestion</span>
                    <div className="text-slate-200 font-semibold">{sc.input}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 font-mono">Project Analysis Detection</span>
                    <div className="text-slate-200 font-semibold">{sc.analysis}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-cyan-400 font-mono">SAST Findings</span>
                    <div className="text-slate-300">{sc.sast}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-emerald-400 font-mono">SCA Dependencies</span>
                    <div className="text-slate-300">{sc.sca}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-amber-400 font-mono">DAST Runtime Status</span>
                    <div className="text-slate-300">{sc.dast}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-purple-400 font-mono">GNN AI CPG Telemetry</span>
                    <div className="text-slate-300">{sc.gnn}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* CTA Footer Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-cyan-500/30 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl space-y-6">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Ready to Run Your First Security Assessment?
            </h3>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Create an account or connect your repository to perform comprehensive static, dependency, dynamic, and AI-powered binary security analysis.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold font-mono tracking-wider bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-xl shadow-cyan-500/30 transition-all flex items-center justify-center space-x-2"
              >
                <span>{isAuthenticated ? 'LAUNCH CONSOLE' : 'CREATE FREE ACCOUNT'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-semibold font-mono tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
              >
                <span>SIGN IN TO CONSOLE</span>
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#050914]/90 backdrop-blur-xl py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <ZentronyxLogo size="sm" showText={true} />
            </Link>

            <div className="flex items-center space-x-6 text-xs text-slate-400">
              <Link to="/" className="hover:text-cyan-400 transition-colors">
                Home
              </Link>
              <Link to="/how-it-works" className="text-cyan-400 font-semibold">
                How It Works
              </Link>
              <Link to="/login" className="hover:text-cyan-400 transition-colors">
                Console Login
              </Link>
              <Link to="/register" className="hover:text-cyan-400 transition-colors">
                Register
              </Link>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              &copy; {new Date().getFullYear()} Zentronyx Platform. Licensed under Apache 2.0.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HowItWorks;
