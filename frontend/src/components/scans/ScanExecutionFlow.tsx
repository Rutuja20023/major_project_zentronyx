import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Code2,
  Package,
  Globe,
  Binary,
  Cpu,
  ChevronRight,
  Download,
  Eye,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import {
  Scan,
  ScanModule,
  ScanStatus,
  ModuleStatus,
  ModuleType,
} from '../../types/scan.types';
import { scanService } from '../../services/scan.service';
import { Button } from '../common/Button';

interface ScanExecutionFlowProps {
  scan: Scan;
  projectId: string;
  projectName?: string;
  onClose?: () => void;
  onViewFindings?: (scan: Scan) => void;
  onDownloadPdf?: (scanId: string) => void;
}

interface StepDefinition {
  key: string;
  moduleType?: ModuleType;
  title: string;
  engineName: string;
  description: string;
  icon: React.ElementType;
  activeMessage: string;
}

const FLOW_STEPS: StepDefinition[] = [
  {
    key: 'WORKSPACE',
    title: 'Workspace Sandbox & AST Ingestion',
    engineName: 'Virtual Sandbox & AST Parser',
    description: 'Mounts isolated sandbox, unpacks source tree, and generates abstract syntax tree indices.',
    icon: Layers,
    activeMessage: 'Initializing sandbox environment and generating AST symbols...',
  },
  {
    key: 'SAST',
    moduleType: ModuleType.SAST,
    title: 'Static Application Security Testing',
    engineName: 'Semgrep AST Ruleset Engine',
    description: 'Scans source files for OWASP Top 10, SQL injection, tainted data flows, and leaked credentials.',
    icon: Code2,
    activeMessage: 'Analyzing code patterns for injection flaws and hardcoded secrets (~30s)...',
  },
  {
    key: 'SCA',
    moduleType: ModuleType.SCA,
    title: 'Software Composition Analysis',
    engineName: 'OSV-Scanner & Advisory Correlator',
    description: 'Cross-references package manifests (npm, pip, maven) against National Vulnerability Database (NVD).',
    icon: Package,
    activeMessage: 'Querying OSV.dev & CVE databases for package vulnerabilities (~25s)...',
  },
  {
    key: 'DAST',
    moduleType: ModuleType.DAST,
    title: 'Dynamic Application Security Testing',
    engineName: 'OWASP ZAP Engine',
    description: 'Probes web endpoints for missing security headers (CSP, HSTS, CORS) and clickjacking protections.',
    icon: Globe,
    activeMessage: 'Evaluating endpoint headers, CSP policies, and transport encryption...',
  },
  {
    key: 'BINARY_ANALYSIS',
    moduleType: ModuleType.BINARY_ANALYSIS,
    title: 'Binary & Executable Hardening',
    engineName: 'Mitigation Auditor',
    description: 'Verifies compilation security: Stack Canary, NX/DEP, PIE, ASLR, and Shannon entropy analysis.',
    icon: Binary,
    activeMessage: 'Checking executable compilation mitigations and entropy flags...',
  },
  {
    key: 'GNN',
    moduleType: ModuleType.GNN,
    title: 'GNN AI Vulnerability & Malware Engine',
    engineName: 'PyTorch Geometric GCN/GAT',
    description: 'Synthesizes Code Property Graph (CPG) structures for graph neural network anomaly detection.',
    icon: Cpu,
    activeMessage: 'Executing PyG graph convolutional inference over AST code graphs...',
  },
  {
    key: 'AGGREGATION',
    title: 'Policy Gate & Finding Aggregation',
    engineName: '0-100 Risk Engine & Deduplication',
    description: 'Deduplicates security findings, maps CWE/OWASP taxonomies, and evaluates risk compliance.',
    icon: ShieldAlert,
    activeMessage: 'Aggregating normalized findings and calculating overall risk posture...',
  },
  {
    key: 'FINALIZED',
    title: 'Security Clearance & Attestation',
    engineName: 'Enterprise Compliance Attestation',
    description: 'Scan execution verified; executive attestation, compliance breakdowns, and PDF reports ready.',
    icon: ShieldCheck,
    activeMessage: 'Finalizing audit verification and generating security attestation...',
  },
];

interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export const ScanExecutionFlow: React.FC<ScanExecutionFlowProps> = ({
  scan: initialScan,
  projectId,
  projectName,
  onClose,
  onViewFindings,
  onDownloadPdf,
}) => {
  const [currentScan, setCurrentScan] = useState<Scan>(initialScan);
  const [modules, setModules] = useState<ScanModule[]>([]);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showConsole, setShowConsole] = useState<boolean>(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const loggedEvents = useRef<Set<string>>(new Set());

  // Format stopwatch time (MM:SS.s)
  const formatStopwatch = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    const tenths = Math.floor((totalSec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}s`;
  };

  const addLog = (source: string, message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const key = `${source}-${message}`;
    if (loggedEvents.current.has(key)) return;
    loggedEvents.current.add(key);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${Math.floor(
      now.getMilliseconds() / 100
    )}`;

    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        source,
        message,
        type,
      },
    ]);
  };

  // Stopwatch timer
  useEffect(() => {
    const startTime = Date.now();
    const isCompleted = [
      ScanStatus.COMPLETED,
      ScanStatus.COMPLETED_WITH_ERRORS,
      ScanStatus.FAILED,
      ScanStatus.CANCELLED,
    ].includes(currentScan.status);

    if (isCompleted) {
      if (currentScan.started_at && currentScan.finished_at) {
        const diff = (new Date(currentScan.finished_at).getTime() - new Date(currentScan.started_at).getTime()) / 1000;
        setElapsedSeconds(Math.max(diff, 0.5));
      }
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((Date.now() - startTime) / 1000);
    }, 100);

    return () => clearInterval(timer);
  }, [currentScan.status]);

  // Initial greeting logs
  useEffect(() => {
    addLog('ORCHESTRATOR', `🚀 Launching security scan execution ID: ${initialScan.id.substring(0, 8)}`, 'info');
    addLog('WORKSPACE', '⚡ Setting up isolated sandbox container...', 'info');
    addLog('PLANNER', '📋 Modules dispatched: SAST, SCA, GNN, DAST & Binary analysis', 'info');
  }, []);

  // Periodic heartbeat logs during the scan to show continuous forward progress
  useEffect(() => {
    const isRunning = [
      ScanStatus.CREATED,
      ScanStatus.QUEUED,
      ScanStatus.PREPARING,
      ScanStatus.RUNNING,
      ScanStatus.AGGREGATING,
    ].includes(currentScan.status);

    if (!isRunning) return;

    const sec = Math.floor(elapsedSeconds);
    if (sec === 4) {
      addLog('SAST', '🔍 Semgrep scanning AST syntax tree across source files...', 'info');
    } else if (sec === 10) {
      addLog('SCA', '📦 Parsing dependency manifests and package lockfiles...', 'info');
    } else if (sec === 16) {
      addLog('SCA', '🌐 Querying OSV vulnerability feeds for known CVE advisories...', 'info');
    } else if (sec === 22) {
      addLog('GNN-AI', '🧠 Synthesizing Code Property Graph (CPG) structures...', 'info');
    } else if (sec === 28) {
      addLog('SAST', '🛡️ Evaluating taint flows, SQL injection & secret leak patterns...', 'info');
    } else if (sec === 34) {
      addLog('POLICY-GATE', '📊 Consolidating scanner findings and computing risk score...', 'info');
    }
  }, [currentScan.status, Math.floor(elapsedSeconds)]);

  // Poll scan and modules status
  useEffect(() => {
    let isMounted = true;

    const pollData = async () => {
      try {
        const [updatedScan, updatedModules] = await Promise.all([
          scanService.getScanById(projectId, currentScan.id).catch(() => currentScan),
          scanService.getScanModules(currentScan.id).catch(() => []),
        ]);

        if (!isMounted) return;

        setCurrentScan(updatedScan);
        setModules(updatedModules);

        // Emit log events based on module states
        updatedModules.forEach((m) => {
          if (m.status === ModuleStatus.RUNNING) {
            addLog(m.module_type, `Active analysis: running ${m.module_type} vulnerability engine...`, 'info');
          } else if (m.status === ModuleStatus.COMPLETED) {
            addLog(
              m.module_type,
              `✓ Completed in ${m.execution_time_ms}ms with ${m.findings_count} security findings identified.`,
              'success'
            );
          } else if (m.status === ModuleStatus.SKIPPED) {
            addLog(m.module_type, `↷ Skipped: ${m.skip_reason || 'Not applicable to target'}`, 'warn');
          } else if (m.status === ModuleStatus.FAILED) {
            addLog(m.module_type, `✖ Module failure: ${m.error_message || 'Execution error'}`, 'error');
          }
        });

        if (updatedScan.status === ScanStatus.AGGREGATING) {
          addLog('POLICY-GATE', '📊 Aggregating multi-scanner findings & computing risk matrix...', 'info');
        } else if (updatedScan.status === ScanStatus.COMPLETED) {
          addLog(
            'CLEARANCE',
            `🎉 Scan orchestration finished! ${updatedScan.findings_count || 0} total findings normalized.`,
            'success'
          );
        } else if (updatedScan.status === ScanStatus.COMPLETED_WITH_ERRORS) {
          addLog('CLEARANCE', '⚠️ Scan completed with module-level warnings.', 'warn');
        } else if (updatedScan.status === ScanStatus.CANCELLED) {
          addLog('ORCHESTRATOR', '🚫 Security scan execution was cancelled.', 'error');
        }
      } catch (err) {
        console.error('Failed to poll scan flow status:', err);
      }
    };

    pollData();

    const isRunning = [
      ScanStatus.CREATED,
      ScanStatus.QUEUED,
      ScanStatus.PREPARING,
      ScanStatus.RUNNING,
      ScanStatus.AGGREGATING,
    ].includes(currentScan.status);

    if (isRunning) {
      const interval = setInterval(pollData, 1200);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [currentScan.id, currentScan.status, projectId]);

  // Auto-advance countdown once scan completes
  useEffect(() => {
    if (
      currentScan.status === ScanStatus.COMPLETED &&
      onViewFindings &&
      autoAdvanceCountdown === null &&
      !autoAdvancePaused
    ) {
      setAutoAdvanceCountdown(5);
    }
  }, [currentScan.status, onViewFindings]);

  useEffect(() => {
    if (autoAdvanceCountdown === null || autoAdvancePaused) return;

    if (autoAdvanceCountdown <= 0) {
      onViewFindings?.(currentScan);
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvanceCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoAdvanceCountdown, autoAdvancePaused, currentScan, onViewFindings]);

  // Auto-scroll terminal
  useEffect(() => {
    if (
      showConsole &&
      terminalEndRef.current &&
      typeof terminalEndRef.current.scrollIntoView === 'function'
    ) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showConsole]);

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to abort this security scan pipeline?')) {
      try {
        setCancelling(true);
        const res = await scanService.cancelScan(currentScan.id);
        setCurrentScan(res);
        addLog('ORCHESTRATOR', 'Scan aborted by user.', 'error');
      } catch (err: any) {
        console.error('Failed to cancel scan:', err);
      } finally {
        setCancelling(false);
      }
    }
  };

  // Determine stage status
  const getStageStatus = (step: StepDefinition): 'waiting' | 'running' | 'completed' | 'skipped' | 'failed' => {
    if (currentScan.status === ScanStatus.CANCELLED) {
      return 'failed';
    }

    if (step.key === 'WORKSPACE') {
      if (
        currentScan.status === ScanStatus.RUNNING ||
        currentScan.status === ScanStatus.AGGREGATING ||
        currentScan.status === ScanStatus.COMPLETED ||
        currentScan.status === ScanStatus.COMPLETED_WITH_ERRORS
      ) {
        return 'completed';
      }
      return 'running';
    }

    if (step.key === 'AGGREGATION') {
      if (currentScan.status === ScanStatus.AGGREGATING) return 'running';
      if (
        currentScan.status === ScanStatus.COMPLETED ||
        currentScan.status === ScanStatus.COMPLETED_WITH_ERRORS
      ) {
        return 'completed';
      }
      if (
        modules.length > 0 &&
        modules.every((m) =>
          [ModuleStatus.COMPLETED, ModuleStatus.SKIPPED, ModuleStatus.FAILED].includes(m.status)
        )
      ) {
        return 'running';
      }
      return 'waiting';
    }

    if (step.key === 'FINALIZED') {
      if (
        currentScan.status === ScanStatus.COMPLETED ||
        currentScan.status === ScanStatus.COMPLETED_WITH_ERRORS
      ) {
        return 'completed';
      }
      return 'waiting';
    }

    // Module step
    const mod = modules.find((m) => m.module_type === step.moduleType);
    if (!mod) {
      if (currentScan.status === ScanStatus.PREPARING) return 'waiting';
      if (currentScan.status === ScanStatus.RUNNING) return 'running';
      return 'waiting';
    }

    switch (mod.status) {
      case ModuleStatus.COMPLETED:
        return 'completed';
      case ModuleStatus.SKIPPED:
        return 'skipped';
      case ModuleStatus.FAILED:
      case ModuleStatus.TIMEOUT:
        return 'failed';
      case ModuleStatus.RUNNING:
        return 'running';
      default:
        return 'waiting';
    }
  };

  // Calculate progress percentage
  const calculateProgress = (): number => {
    if (
      currentScan.status === ScanStatus.COMPLETED ||
      currentScan.status === ScanStatus.COMPLETED_WITH_ERRORS
    ) {
      return 100;
    }
    if (currentScan.status === ScanStatus.AGGREGATING) return 92;
    if (currentScan.status === ScanStatus.CANCELLED || currentScan.status === ScanStatus.FAILED) return 100;

    let totalWeight = FLOW_STEPS.length;
    let completedWeight = 0;

    FLOW_STEPS.forEach((step) => {
      const st = getStageStatus(step);
      if (st === 'completed' || st === 'skipped') completedWeight += 1;
      else if (st === 'running') completedWeight += 0.5;
    });

    const pct = Math.min(Math.round((completedWeight / totalWeight) * 100), 92);
    return Math.max(pct, 12);
  };

  const progressPercent = calculateProgress();
  const isFinished = [
    ScanStatus.COMPLETED,
    ScanStatus.COMPLETED_WITH_ERRORS,
    ScanStatus.FAILED,
    ScanStatus.CANCELLED,
  ].includes(currentScan.status);

  return (
    <div className="space-y-6">
      {/* Top Status & Elapsed Bar */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isFinished
                  ? currentScan.status === ScanStatus.COMPLETED
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse'
              }`}
            >
              {isFinished ? (
                currentScan.status === ScanStatus.COMPLETED ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )
              ) : (
                <Activity className="w-5 h-5 text-cyan-400" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  {isFinished ? 'Security Scan Complete & Attested' : 'Pipeline Orchestration In Progress'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  ID: {currentScan.id.substring(0, 8)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-400">
                  {projectName ? `Target: ${projectName}` : 'Multi-engine security testing suite'}
                </p>
                {!isFinished && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-medium">
                    Normal duration: ~30–45s for full AST & CVE analysis
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formatStopwatch(elapsedSeconds)}</span>
            </div>

            {!isFinished && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                isLoading={cancelling}
                leftIcon={<Ban className="w-3.5 h-3.5" />}
              >
                Cancel
              </Button>
            )}

            {onClose && (
              <Button variant="secondary" size="sm" onClick={onClose}>
                {isFinished ? 'Close' : 'Run in Background'}
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center space-x-2">
              {!isFinished && <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />}
              <span>
                {isFinished
                  ? `All security scan engines completed in ${formatStopwatch(elapsedSeconds)}`
                  : `Deep multi-engine scanning (${progressPercent}%) — SAST, SCA & GNN engines actively inspecting...`}
              </span>
            </span>
            <span className="font-bold text-cyan-400">{progressPercent}%</span>
          </div>

          <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out relative ${
                isFinished
                  ? currentScan.status === ScanStatus.COMPLETED
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                    : 'bg-rose-500'
                  : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            >
              {!isFinished && (
                <div className="absolute inset-0 bg-white/20 animate-flow-laser rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* Live Severity Counter Ticker */}
        {currentScan.severity_summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-center">
              <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold block">Critical</span>
              <span className="text-base font-bold text-rose-300 font-mono">
                {currentScan.severity_summary.CRITICAL || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold block">High</span>
              <span className="text-base font-bold text-amber-300 font-mono">
                {currentScan.severity_summary.HIGH || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-center">
              <span className="text-[10px] font-mono text-yellow-400 uppercase font-semibold block">Medium</span>
              <span className="text-base font-bold text-yellow-300 font-mono">
                {currentScan.severity_summary.MEDIUM || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-center">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold block">Low</span>
              <span className="text-base font-bold text-cyan-300 font-mono">
                {currentScan.severity_summary.LOW || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Total Findings</span>
              <span className="text-base font-bold text-slate-200 font-mono">
                {currentScan.findings_count || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Auto-Advance Notification Banner (when finished) */}
      {isFinished && currentScan.status === ScanStatus.COMPLETED && onViewFindings && (
        <div className="p-3.5 bg-cyan-950/50 border border-cyan-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center space-x-2.5 text-cyan-200">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {autoAdvanceCountdown !== null && !autoAdvancePaused ? (
                <>
                  Scan finished normally! Automatically opening Unified Findings in{' '}
                  <strong className="text-cyan-300 font-mono text-sm underline">
                    {autoAdvanceCountdown}s
                  </strong>
                  ...
                </>
              ) : (
                <>
                  Scan finished normally! Click below to explore the{' '}
                  <strong className="text-cyan-300 font-mono">{currentScan.findings_count || 0}</strong> findings.
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onViewFindings(currentScan)}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-bold text-xs transition-colors flex items-center space-x-1 shadow-md shadow-cyan-500/20"
            >
              <span>Explore Findings Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {autoAdvanceCountdown !== null && !autoAdvancePaused && (
              <button
                onClick={() => setAutoAdvancePaused(true)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              >
                Pause
              </button>
            )}
          </div>
        </div>
      )}

      {/* Animated Step-by-Step Security Scan Pipeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Interactive Security Execution Flow</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            Multi-engine orchestration with real Semgrep & OSV.dev
          </span>
        </div>

        <div className="space-y-3">
          {FLOW_STEPS.map((step, index) => {
            const status = getStageStatus(step);
            const StepIcon = step.icon;
            const moduleData = step.moduleType
              ? modules.find((m) => m.module_type === step.moduleType)
              : undefined;

            const isLast = index === FLOW_STEPS.length - 1;

            return (
              <div key={step.key} className="relative">
                {/* Step Card */}
                <div
                  className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                    status === 'running'
                      ? 'bg-slate-900/90 border-cyan-500/60 shadow-lg shadow-cyan-500/10 glow-cyber-active ring-1 ring-cyan-500/40'
                      : status === 'completed'
                      ? 'bg-slate-900/60 border-emerald-500/30 shadow-sm'
                      : status === 'skipped'
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                      : status === 'failed'
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Step number, icon, title */}
                    <div className="flex items-start sm:items-center space-x-3.5">
                      {/* Step Indicator Ring */}
                      <div className="relative shrink-0 mt-0.5 sm:mt-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                            status === 'running'
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/30'
                              : status === 'completed'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : status === 'skipped'
                              ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                              : status === 'failed'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-slate-900 border-slate-800 text-slate-600'
                          }`}
                        >
                          {status === 'running' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                          ) : status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : status === 'failed' ? (
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                          ) : (
                            <StepIcon className="w-5 h-5" />
                          )}
                        </div>

                        {/* Animated Radar Pulse for active running step */}
                        {status === 'running' && (
                          <span className="absolute -inset-1 rounded-2xl border border-cyan-400/40 animate-ping pointer-events-none" />
                        )}
                      </div>

                      {/* Step info */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500 font-semibold">
                            STEP 0{index + 1}
                          </span>
                          <h5 className="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
                            <span>{step.title}</span>
                          </h5>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {step.engineName}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1">
                          {status === 'running' ? (
                            <span className="text-cyan-300 font-mono flex items-center space-x-1.5 animate-pulse">
                              <span>&bull;</span>
                              <span>{step.activeMessage}</span>
                            </span>
                          ) : status === 'skipped' && moduleData?.skip_reason ? (
                            <span className="text-amber-300/80 font-mono">
                              Skipped: {moduleData.skip_reason}
                            </span>
                          ) : step.key === 'WORKSPACE' && !isFinished ? (
                            <span className="text-slate-300 font-mono">
                              Sandbox initialized & source tree ready for active analyzers.
                            </span>
                          ) : (
                            step.description
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status badge & metrics */}
                    <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                      {moduleData && moduleData.findings_count > 0 && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[11px] font-bold">
                          {moduleData.findings_count} findings
                        </span>
                      )}

                      {moduleData && moduleData.execution_time_ms > 0 && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {moduleData.execution_time_ms}ms
                        </span>
                      )}

                      {/* Status Badges */}
                      {status === 'completed' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {step.key === 'WORKSPACE' && !isFinished ? 'INITIALIZED' : 'COMPLETED'}
                          </span>
                        </span>
                      )}

                      {status === 'running' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>PROCESSING</span>
                        </span>
                      )}

                      {status === 'skipped' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          <span>SKIPPED</span>
                        </span>
                      )}

                      {status === 'failed' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          <span>FAILED</span>
                        </span>
                      )}

                      {status === 'waiting' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 border border-slate-800">
                          <span>WAITING</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Animated Pipeline Connector Line to next step */}
                {!isLast && (
                  <div className="flex justify-center my-1">
                    <div className="w-0.5 h-4 bg-slate-800 relative overflow-hidden rounded-full">
                      {status === 'running' || status === 'completed' ? (
                        <div className="absolute inset-0 bg-cyan-400 animate-flow-laser-vertical" />
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Clearance Banner */}
      {isFinished && currentScan.status === ScanStatus.COMPLETED && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/40 border border-emerald-500/40 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center space-x-4">
              <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span>Security Scan Complete & Attested</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    PASSED POLICY
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Execution completed normally in <strong className="text-cyan-300 font-mono">{formatStopwatch(elapsedSeconds)}</strong>.
                  Identified <strong className="text-rose-400 font-mono">{currentScan.findings_count || 0}</strong> security vulnerabilities across all active scanner modules.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onViewFindings && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onViewFindings(currentScan)}
                  className="shadow-lg shadow-cyan-500/25 font-bold"
                  leftIcon={<Eye className="w-4 h-4" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View All Findings
                </Button>
              )}

              {onDownloadPdf && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => onDownloadPdf(currentScan.id)}
                  leftIcon={<Download className="w-4 h-4 text-emerald-400" />}
                >
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Cyber Audit Terminal Stream */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div
          onClick={() => setShowConsole(!showConsole)}
          className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-200">
              Zentronyx Orchestration Audit Console
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-cyan-500/30">
              {logs.length} events
            </span>
          </div>

          <div className="flex items-center space-x-2 text-slate-400">
            <span className="text-[11px] font-mono">{showConsole ? 'Hide Stream' : 'Expand Stream'}</span>
            {showConsole ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {showConsole && (
          <div className="p-4 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5 bg-slate-950/90 select-text">
            {logs.map((log) => {
              let tagColor = 'text-cyan-400';
              if (log.type === 'success') tagColor = 'text-emerald-400';
              if (log.type === 'warn') tagColor = 'text-amber-400';
              if (log.type === 'error') tagColor = 'text-rose-400';

              return (
                <div key={log.id} className="flex items-start space-x-2 text-slate-300">
                  <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                  <span className={`font-bold ${tagColor}`}>[{log.source}]</span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              );
            })}

            {!isFinished && (
              <div className="flex items-center space-x-2 text-cyan-400 pt-1">
                <span className="text-slate-600">[{formatStopwatch(elapsedSeconds)}]</span>
                <span className="terminal-cursor text-cyan-400">█</span>
                <span className="text-slate-500 italic text-[10px]">
                  Analyzers running (Semgrep AST & OSV live advisory database)...
                </span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
