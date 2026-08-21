import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Cpu,
  Code2,
  Package,
  Globe,
  Binary,
  Layers,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Lock,
  UploadCloud,
  FileText,
  ChevronRight,
  Award,
  Shield,
  Network,
  XCircle,
  FileCheck,
  RefreshCw,
  FolderGit2,
  Activity,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ZentronyxLogo } from '../components/common/ZentronyxLogo';
import { LogoSplashScreen } from '../components/common/LogoSplashScreen';
import { MovingVideoBackground } from '../components/common/MovingVideoBackground';

export const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'sast' | 'sca' | 'dast' | 'binary' | 'gnn'>('sast');
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    // Show splash screen on first session visit
    return sessionStorage.getItem('zentronyx_splash_seen') !== 'true';
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('zentronyx_splash_seen', 'true');
    setShowSplash(false);
  };

  const handleReplaySplash = () => {
    setShowSplash(true);
  };

  const capabilities = [
    {
      id: 'sast',
      title: 'Static Application Security Testing (SAST)',
      tag: 'Semgrep Engine',
      icon: Code2,
      color: 'cyan',
      headline: 'Deep Semantic Pattern & AST Code Security Analysis',
      description:
        'Analyzes multi-language source repositories without compilation. Identifies insecure coding patterns, hardcoded credentials, SQL injection vulnerabilities, and path traversal flaws prior to production release.',
      features: [
        'Semgrep auto-configured rulesets mapping to CWE and OWASP Top 10',
        'Direct AST traversal without code execution for maximum safety',
        'Precise source file, line number, and column tracking',
        'Supports Python, TypeScript, JavaScript, Java, Go, Rust, and C/C++',
      ],
      metrics: 'Over 2,400+ curated security rules',
    },
    {
      id: 'sca',
      title: 'Software Composition Analysis (SCA)',
      tag: 'OSV-Scanner & OSV.dev',
      icon: Package,
      color: 'emerald',
      headline: 'Automated Dependency & Third-Party CVE Intelligence',
      description:
        'Examines project dependency manifests and lockfiles against the global Open Source Vulnerability (OSV) database to identify known vulnerabilities in open-source components with exact remediation versions.',
      features: [
        'Multi-ecosystem coverage: PyPI, npm, Maven, Go Modules, Cargo',
        'Real-time CVE & GHSA vulnerability correlation',
        'Automated fixed-version upgrade recommendations',
        'Manifest parsing for requirements.txt, package-lock.json, pom.xml, Cargo.lock',
      ],
      metrics: 'Synchronized with OSV.dev vulnerability database',
    },
    {
      id: 'dast',
      title: 'Dynamic Application Security Testing (DAST)',
      tag: 'OWASP ZAP Engine',
      icon: Globe,
      color: 'amber',
      headline: 'Runtime Web Application Defense & Baseline Probing',
      description:
        'Tests supported running web applications from the outside to identify runtime security issues, improper response headers, and configuration flaws with strict loopback and container SSRF guards.',
      features: [
        'SSRF-safe loopback and isolated container target guard',
        'Security headers verification (CSP, HSTS, X-Frame-Options)',
        'MIME-sniffing and server information disclosure audits',
        'Graceful execution with automatic fallback for non-web projects',
      ],
      metrics: 'SSRF target boundary enforcement',
    },
    {
      id: 'binary',
      title: 'Binary Hardening & Mitigation Inspection',
      tag: 'ELF / PE Static Analyzer',
      icon: Binary,
      color: 'blue',
      headline: 'Native Executable Defense & Compiler Mitigation Verification',
      description:
        'Statically inspects Linux ELF and Windows PE executable artifacts to verify essential compiler exploit mitigations without executing untrusted binaries.',
      features: [
        'Stack-smashing protection (-fstack-protector) validation',
        'No-Execute / Data Execution Prevention (NX/DEP) check',
        'Position Independent Executable (PIE/ASLR) verification',
        'Shannon entropy computation for packing and obfuscation detection',
      ],
      metrics: '100% static inspection (zero binary execution)',
    },
    {
      id: 'gnn',
      title: 'AI / Graph Neural Network Malware Detection',
      tag: 'PyG / PyTorch GNN Engine',
      icon: Cpu,
      color: 'purple',
      headline: 'Deep Learning Structural Code Property Graph (CPG) Classifier',
      description:
        'A dedicated deep learning microservice leveraging Graph Convolutional Networks (GCN) to evaluate control-flow and syntax graph topologies of supported binaries to identify suspicious malware patterns.',
      features: [
        'Graph Convolutional Network (GCN) inference microservice',
        'Node-degree weighted graph embedding aggregation',
        'Analyzes structural graph representations of supported binaries',
        'Deterministic JSON prediction contracts with confidence scoring',
      ],
      metrics: 'Evaluates structural graph topologies',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Create Project',
      subtitle: 'Workspace Setup',
      description: 'Initialize a secure workspace that acts as the central repository for source, scans, findings, risk, and reports.',
      icon: FolderGit2,
    },
    {
      step: '02',
      title: 'Choose Source',
      subtitle: 'Select Ingestion Method',
      description: 'Choose between direct local archive upload or connecting an authenticated GitHub cloud repository.',
      icon: Layers,
    },
    {
      step: '03',
      title: 'Ingest Source',
      subtitle: 'ZIP or GitHub OAuth',
      description: 'Upload ZIP archive with Zip Slip mitigation or clone branch with commit hash tracking and HMAC validation.',
      icon: UploadCloud,
    },
    {
      step: '04',
      title: 'Project Analysis',
      subtitle: 'Static Ecosystem Discovery',
      description: 'Automatically detects languages, frameworks, manifests, build systems, web surfaces, and native binaries.',
      icon: Code2,
    },
    {
      step: '05',
      title: 'Security Scanning',
      subtitle: 'Parallel Multi-Engine Execution',
      description: 'Executes SAST, SCA, DAST, Binary Hardening, and GNN AI models concurrently with isolation guards.',
      icon: Activity,
    },
    {
      step: '06',
      title: 'Result Aggregation',
      subtitle: 'SHA-256 Deduplication',
      description: 'Aggregates findings from all engines into a unified schema, deduplicating repetitive issues via SHA-256 signatures.',
      icon: Network,
    },
    {
      step: '07',
      title: 'Risk Assessment',
      subtitle: 'Transparent 0-100 Score',
      description: 'Calculates formulaic weighted risk score (Critical: 10, High: 5, Medium: 2, Low: 0.5) mapped to clear posture tiers.',
      icon: Award,
    },
    {
      step: '08',
      title: 'Security Report',
      subtitle: 'Audit-Ready PDF & JSON',
      description: 'Generates comprehensive compliance reports, remediation targets, and automated CI/CD policy decisions (PASS/BLOCK).',
      icon: FileCheck,
    },
  ];

  const languages = [
    { name: 'Python', role: 'FastAPI / Django / Flask' },
    { name: 'TypeScript', role: 'React / Node.js / Next.js' },
    { name: 'JavaScript', role: 'Express / Vue / Web Apps' },
    { name: 'Java', role: 'Spring Boot / Maven / Gradle' },
    { name: 'Go', role: 'Microservices / Cloud Native' },
    { name: 'Rust', role: 'Systems / Cargo / WebAssembly' },
    { name: 'C / C++', role: 'Binaries / Native Hardening' },
    { name: 'ELF / PE', role: 'Linux & Windows Binaries' },
  ];

  const activeCapability = capabilities.find((c) => c.id === activeTab) || capabilities[0];

  return (
    <div className="relative min-h-screen text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Optional Logo Intro Experience Overlay */}
      {showSplash && <LogoSplashScreen onComplete={handleSplashComplete} />}

      {/* Background Cyber Canvas & Video Layer */}
      <MovingVideoBackground />

      {/* Main Content Container on Top of Video */}
      <div className="relative z-10">
        {/* Sticky Top Navigation */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050914]/85 border-b border-cyan-500/15 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Zentronyx Brand Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <ZentronyxLogo size="sm" showText={true} />
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center space-x-7 text-sm font-medium text-slate-300">
              <a href="#hero" className="hover:text-cyan-400 transition-colors">
                Home
              </a>
              <a href="#explore" className="hover:text-cyan-400 transition-colors">
                Explore
              </a>
              <Link to="/how-it-works" className="hover:text-cyan-400 transition-colors flex items-center space-x-1">
                <span>How It Works</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">GUIDE</span>
              </Link>
              <a href="#problem" className="hover:text-cyan-400 transition-colors">
                Why Zentronyx
              </a>
              <a href="#scanners" className="hover:text-cyan-400 transition-colors">
                Security Scans
              </a>
              <a href="#architecture" className="hover:text-cyan-400 transition-colors">
                Architecture
              </a>
            </nav>

            {/* Auth Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReplaySplash}
                title="Replay Brand Intro Animation"
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Intro</span>
              </button>

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
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center space-x-1.5"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section id="hero" className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-8 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>UNIFIED SOFTWARE SECURITY & GRAPH NEURAL NETWORK MALWARE ANALYSIS</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-[1.1] text-slate-100">
            Secure Your Software{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Before It Reaches Production.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            Zentronyx brings static analysis, dependency security, dynamic testing, and AI-powered binary malware detection into one automated security platform.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold font-mono tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center justify-center space-x-2 group"
            >
              <span>{isAuthenticated ? 'LAUNCH CONSOLE' : 'SIGN UP FOR PLATFORM'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-semibold font-mono tracking-wider bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:border-cyan-500/50 transition-all flex items-center justify-center space-x-2"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>SIGN IN</span>
            </button>
            <a
              href="#explore"
              className="w-full sm:w-auto px-7 py-4 rounded-xl text-sm font-semibold font-mono tracking-wider bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 transition-all flex items-center justify-center space-x-2"
            >
              <ChevronRight className="w-4 h-4 rotate-90 text-cyan-400" />
              <span>EXPLORE</span>
            </a>
          </div>

          {/* Hero Visual: Security Pipeline Flow Visual */}
          <div className="mt-16 max-w-5xl mx-auto p-6 rounded-3xl bg-slate-950/80 border border-cyan-500/30 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
                  AUTOMATED SECURITY PIPELINE
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  Continuous Analysis Pipeline Flow
                </h3>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ZERO-EXECUTION STATIC GUARANTEE</span>
              </div>
            </div>

            {/* Pipeline Visual Stages */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { label: '1. Source Code', desc: 'ZIP or GitHub Ingestion', icon: Code2, color: 'cyan' },
                { label: '2. Security Analysis', desc: 'SAST + SCA + DAST', icon: Shield, color: 'emerald' },
                { label: '3. AI Detection', desc: 'GNN CPG Topology', icon: Cpu, color: 'purple' },
                { label: '4. Risk Assessment', desc: '0-100 Weighted Score', icon: Award, color: 'amber' },
                { label: '5. Secure Release', desc: 'PASS / BLOCK Gate', icon: CheckCircle2, color: 'emerald' },
              ].map((stage, idx, arr) => {
                const Icon = stage.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left relative overflow-hidden group hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-slate-200">{stage.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{stage.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Live Interactive Scanner Terminal Mockup */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] text-slate-400 ml-2">
                    zentronyx-cli // scan-orchestrator
                  </span>
                </div>
                <div className="text-[10px] text-cyan-400 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>PARALLEL WORKERS ACTIVE</span>
                </div>
              </div>

              <div className="p-4 space-y-2 text-slate-300 text-[11px]">
                <div className="text-cyan-400">
                  $ zentronyx scan --workspace payments-api --policy strict-production
                </div>
                <div className="text-slate-400">
                  [+] Ingestion: Verified ZIP sandbox (SHA-256: 9f86d08188...) &bull; Zip Slip checks passed.
                </div>
                <div className="text-slate-400">
                  [+] Ecosystem Detection: Python 3.12, FastAPI, requirements.txt, 14 REST Endpoints.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 p-2.5 bg-slate-900/50 rounded border border-slate-800/80">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>SAST: Semgrep Analysis Complete (0 Critical, 1 High)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>SCA: OSV-Scanner (24 packages, 0 Critical CVEs)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>DAST: OWASP ZAP Probing (SSRF-Safe Container Target)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>GNN AI: CPG Evaluated (Prediction: BENIGN, Conf: 96.4%)</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-800 text-[11px] gap-2">
                  <span className="text-slate-400">
                    Risk Assessment: <strong className="text-emerald-400">9.5 / 100 (LOW RISK STATUS)</strong>
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                    POLICY GATE DECISION: ALLOW (PIPELINE APPROVED)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: EXPLORE SECTION */}
        <section id="explore" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              ONE PLATFORM. COMPLETE SOFTWARE SECURITY.
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Multi-Vector Security Analysis Across Every Layer
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              Zentronyx analyzes software from multiple security perspectives to eliminate blind spots between source code flaws, third-party CVEs, runtime headers, and binary malware.
            </p>
          </div>

          {/* Engine Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {capabilities.map((c) => {
              const Icon = c.icon;
              const isActive = activeTab === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveTab(c.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-105'
                      : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{c.tag}</span>
                </button>
              );
            })}
          </div>

          {/* Active Engine Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/70 border border-cyan-500/25 backdrop-blur-xl shadow-2xl shadow-cyan-950/30 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                <span>ANALYSIS MODULE: {activeCapability.tag}</span>
              </div>
              <h4 className="text-2xl sm:text-3xl font-bold text-slate-100">
                {activeCapability.headline}
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {activeCapability.description}
              </p>
              <div className="space-y-2.5 pt-2">
                {activeCapability.features.map((f, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="text-xs font-mono text-slate-400 uppercase">Engine Specifications</div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                <div className="text-xs text-slate-400">Coverage Benchmark</div>
                <div className="text-base font-bold font-mono text-cyan-300">{activeCapability.metrics}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                <div className="text-xs text-slate-400">Execution Safety</div>
                <div className="text-xs font-mono text-emerald-400 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Isolated Ephemeral Execution Vector</span>
                </div>
              </div>
              <Link
                to="/how-it-works"
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-colors flex items-center justify-center space-x-2"
              >
                <span>Learn How {activeCapability.tag} Works</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 8: PROBLEM STATEMENT VS ZENTRONYX SOLUTION */}
        <section id="problem" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              THE FRAGMENTATION DILEMMA
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Why Traditional Security Tools Slow Down Teams
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              Modern software stacks comprise source code, third-party packages, web endpoints, and compiled binaries. Running disparate tools creates blind spots and alert fatigue.
            </p>
          </div>

          {/* Side-by-side Visual Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Traditional Approach */}
            <div className="p-8 rounded-3xl bg-slate-950/70 border border-rose-500/20 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2 text-rose-400">
                  <XCircle className="w-5 h-5" />
                  <h4 className="text-base font-bold text-slate-200">The Fragmented Approach</h4>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  DISCONNECTED
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-400">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <strong className="text-slate-300 block mb-1">Separate Disparate Tools:</strong>
                  Developers juggle SAST tools, dependency checkers, web scanners, and binary inspectors independently.
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <strong className="text-slate-300 block mb-1">Manual Correlation Nightmare:</strong>
                  Security engineers must manually cross-reference conflicting findings across 4 different dashboards.
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <strong className="text-slate-300 block mb-1">Inconsistent Risk Severity:</strong>
                  Different tools assign subjective risk scores, making overall software posture impossible to evaluate.
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <strong className="text-slate-300 block mb-1">Delayed Merges & Releases:</strong>
                  Security reviews happen late in the pipeline, causing last-minute deployment blockers.
                </div>
              </div>
            </div>

            {/* Zentronyx Unified Solution */}
            <div className="p-8 rounded-3xl bg-slate-950/70 border border-cyan-500/30 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2 text-cyan-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <h4 className="text-base font-bold text-slate-200">The Zentronyx Unified Workflow</h4>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  ALL-IN-ONE
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-cyan-500/20">
                  <strong className="text-cyan-300 block mb-1">Single Orchestrated Pipeline:</strong>
                  Submit a ZIP or connect GitHub once; Zentronyx coordinates SAST, SCA, DAST, and GNN AI models in parallel.
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-cyan-500/20">
                  <strong className="text-cyan-300 block mb-1">SHA-256 Deduplicated Findings:</strong>
                  Unified result aggregator eliminates noisy duplicates and provides clean line-by-line remediation context.
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-cyan-500/20">
                  <strong className="text-cyan-300 block mb-1">Formulaic 0-100 Risk Engine:</strong>
                  Non-blackbox mathematical scoring formula maps findings directly into CRITICAL, HIGH, MEDIUM, and LOW tiers.
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-cyan-500/20">
                  <strong className="text-cyan-300 block mb-1">Automated CI/CD Policy Gates:</strong>
                  Instantly outputs PASS or BLOCK decisions and exports compliance-ready PDF / JSON reports.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 9: HOW IT WORKS PREVIEW */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              END-TO-END PIPELINE PREVIEW
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              How Zentronyx Works
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              An 8-step automated journey from project creation and source ingestion to multi-scanner execution and policy decision.
            </p>
          </div>

          {/* 8-Step Timeline Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black font-mono text-cyan-500/30 group-hover:text-cyan-400 transition-colors">
                        {step.step}
                      </span>
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">{step.title}</h4>
                    <div className="text-[11px] font-mono text-cyan-300">{step.subtitle}</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/how-it-works"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white font-mono text-xs font-bold transition-colors"
            >
              <span>EXPLORE COMPLETE WORKFLOW & DOCUMENTATION</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Section 16 & 17: SECURITY SCANNING MODULES & PIPELINE ANIMATION */}
        <section id="scanners" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              SECURITY ANALYSIS ENGINE
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Orchestrated Scanner Architecture
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              Independent scanning workers execute asynchronously across isolated boundaries with failure containment.
            </p>
          </div>

          {/* Architecture Pipeline Flow Diagram */}
          <div className="p-8 rounded-3xl bg-slate-950/80 border border-slate-800 backdrop-blur-xl max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-3">
                <FolderGit2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">1. Project & Ingestion Hub</div>
                  <div className="text-[11px] text-slate-400 font-mono">ZIP Archive or GitHub Branch &bull; Zip Slip Guard</div>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400">ISOLATED WORKSPACE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center space-x-2 text-cyan-400">
                  <Code2 className="w-4 h-4" />
                  <span className="text-xs font-bold">SAST (Semgrep)</span>
                </div>
                <div className="text-[11px] text-slate-400">AST semantic code pattern inspection</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Package className="w-4 h-4" />
                  <span className="text-xs font-bold">SCA (OSV-Scanner)</span>
                </div>
                <div className="text-[11px] text-slate-400">Dependency lockfile CVE correlation</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-bold">DAST (OWASP ZAP)</span>
                </div>
                <div className="text-[11px] text-slate-400">SSRF-safe web headers verification</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center space-x-2 text-blue-400">
                  <Binary className="w-4 h-4" />
                  <span className="text-xs font-bold">Binary Hardening</span>
                </div>
                <div className="text-[11px] text-slate-400">Stack Canary, NX/DEP, PIE/ASLR, Shannon entropy</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-purple-500/25 space-y-1.5">
                <div className="flex items-center space-x-2 text-purple-400">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-bold">GNN AI Malware Engine</span>
                </div>
                <div className="text-[11px] text-slate-400">PyG Code Property Graph structural classification</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Unified Aggregator & Policy Gate</div>
                  <div className="text-[11px] text-slate-400 font-mono">SHA-256 Finding Dedup &bull; 0-100 Risk Engine &bull; PDF / JSON Audit Reports</div>
                </div>
              </div>
              <span className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">
                PASS / BLOCK DECISION
              </span>
            </div>
          </div>
        </section>

        {/* Section 18, 19 & 20: RESULT AGGREGATION, RISK SCORE & REPORT PREVIEW */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              TRANSPARENT RISK & AUDIT INTELLIGENCE
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Unified Security Assessment & Risk Posture
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              Zentronyx aggregates scanner outputs into a unified model, calculates transparent risk scores, and outputs audit-ready executive reports.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Risk Posture Visual Card */}
            <div className="lg:col-span-5 p-7 rounded-3xl bg-slate-900/80 border border-cyan-500/25 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">PRODUCT PREVIEW</span>
                  <h4 className="text-base font-bold text-slate-100">Security Risk Posture</h4>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
                  ILLUSTRATIVE PREVIEW
                </span>
              </div>

              {/* Gauge & Metrics */}
              <div className="text-center py-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-xs font-mono text-slate-400 uppercase">Aggregated Posture Score</div>
                <div className="text-5xl font-black font-mono text-cyan-400">82 <span className="text-sm text-slate-400 font-normal">/ 100</span></div>
                <div className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                  HIGH RISK STATUS
                </div>
              </div>

              {/* Severity Breakdown Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-rose-400 font-bold text-base">2</div>
                  <div className="text-[10px] text-slate-400">Critical</div>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <div className="text-orange-400 font-bold text-base">5</div>
                  <div className="text-[10px] text-slate-400">High</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-amber-400 font-bold text-base">12</div>
                  <div className="text-[10px] text-slate-400">Medium</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-emerald-400 font-bold text-base">8</div>
                  <div className="text-[10px] text-slate-400">Low</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                * Note: The metrics above illustrate the posture calculation interface. Platform metrics are computed exclusively from verified scan findings.
              </p>
            </div>

            {/* Report Components Card */}
            <div className="lg:col-span-7 p-7 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-base font-bold text-slate-100">Unified Compliance Report Structure</h4>
                <span className="text-xs font-mono text-cyan-400">PDF & JSON CONTRACTS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Executive Summary</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">High-level security posture overview for leadership & audit teams.</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SAST Code Findings</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">CWE-mapped code snippets with line numbers and fix snippets.</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SCA Dependency Audit</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">Open source vulnerability IDs (CVE/GHSA) and fixed upgrade versions.</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>DAST Web Baseline</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">Runtime security headers, cookie flags, and server banner analysis.</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <Binary className="w-3.5 h-3.5 text-blue-400" />
                    <span>Binary Hardening & Entropy</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">Canary, NX/DEP, PIE/ASLR status, and entropy packing metrics.</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span>GNN AI Structural Verdict</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">Graph Convolutional Network malware anomaly classification.</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">Available in styled PDF reports & REST JSON endpoints.</span>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold transition-colors"
                >
                  Generate Scan Report &rarr;
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Languages & Ecosystems Grid */}
        <section id="architecture" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              ECOSYSTEM COMPATIBILITY
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Supported Languages, Manifests & Binaries
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              Automated technology recognition and specialized scanning for modern web services, native systems, and containerized microservices.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {languages.map((lang, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex items-center space-x-3"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                  {lang.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">{lang.name}</div>
                  <div className="text-[10px] text-slate-400">{lang.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-cyan-500/30 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl space-y-6">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Ready to Secure Your Software Pipeline?
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
              <a href="/docs" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
                FastAPI Swagger Docs
              </a>
              <Link to="/how-it-works" className="hover:text-cyan-400 transition-colors">
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

export default Landing;
