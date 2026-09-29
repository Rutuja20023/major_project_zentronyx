import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Ban,
  Loader2,
  Layers,
  Sparkles,
  Maximize2,
  Code2,
  Package,
  Globe,
  Binary,
  Cpu,
} from 'lucide-react';
import { Scan, ScanModule, ScanStatus, ModuleStatus, ModuleType } from '../../types/scan.types';
import { scanService } from '../../services/scan.service';
import { Button } from '../common/Button';
import { formatTime } from '../../lib/dateUtils';
import { Modal } from '../common/Modal';
import { ScanExecutionFlow } from './ScanExecutionFlow';

interface ScanProgressCardProps {
  scan: Scan;
  projectName?: string;
  onRefresh: () => void;
  onViewFindings?: (scan: Scan) => void;
  onDownloadPdf?: (scanId: string) => void;
}

export const ScanProgressCard: React.FC<ScanProgressCardProps> = ({
  scan,
  projectName,
  onRefresh,
  onViewFindings,
  onDownloadPdf,
}) => {
  const [modules, setModules] = useState<ScanModule[]>([]);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState<boolean>(false);

  const fetchModules = async () => {
    try {
      const data = await scanService.getScanModules(scan.id);
      setModules(data);
    } catch (err) {
      console.error('Failed to load scan modules:', err);
    }
  };

  useEffect(() => {
    fetchModules();
    // Poll every 2.5 seconds if active scan is running
    const isActive = [
      ScanStatus.CREATED,
      ScanStatus.QUEUED,
      ScanStatus.PREPARING,
      ScanStatus.RUNNING,
      ScanStatus.AGGREGATING,
    ].includes(scan.status);

    if (isActive) {
      const interval = setInterval(() => {
        fetchModules();
        onRefresh();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [scan.id, scan.status]);

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel the running security scan?')) {
      try {
        setCancelling(true);
        await scanService.cancelScan(scan.id);
        onRefresh();
      } catch (err: any) {
        console.error('Failed to cancel scan:', err);
      } finally {
        setCancelling(false);
      }
    }
  };

  const getScanStatusBadge = (status: ScanStatus) => {
    switch (status) {
      case ScanStatus.COMPLETED:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>COMPLETED</span>
          </span>
        );
      case ScanStatus.COMPLETED_WITH_ERRORS:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>COMPLETED WITH ERRORS</span>
          </span>
        );
      case ScanStatus.CANCELLED:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <Ban className="w-3.5 h-3.5" />
            <span>CANCELLED</span>
          </span>
        );
      case ScanStatus.FAILED:
      case ScanStatus.TIMEOUT:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{status}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{status}</span>
          </span>
        );
    }
  };

  const getModuleIcon = (modType: ModuleType) => {
    switch (modType) {
      case ModuleType.SAST:
        return Code2;
      case ModuleType.SCA:
        return Package;
      case ModuleType.DAST:
        return Globe;
      case ModuleType.BINARY_ANALYSIS:
        return Binary;
      case ModuleType.GNN:
        return Cpu;
      default:
        return Layers;
    }
  };

  const getModuleStatusBadge = (status: ModuleStatus) => {
    switch (status) {
      case ModuleStatus.COMPLETED:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            COMPLETED
          </span>
        );
      case ModuleStatus.SKIPPED:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 font-mono">
            SKIPPED
          </span>
        );
      case ModuleStatus.RUNNING:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono animate-pulse flex items-center space-x-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>RUNNING</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 font-mono">
            {status}
          </span>
        );
    }
  };

  const isActive = [
    ScanStatus.CREATED,
    ScanStatus.QUEUED,
    ScanStatus.PREPARING,
    ScanStatus.RUNNING,
    ScanStatus.AGGREGATING,
  ].includes(scan.status);

  return (
    <>
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  {projectName ? `${projectName} — Scan Execution` : 'Scan Execution'}
                </h3>
                <span className="text-xs text-slate-400 font-mono">ID: {scan.id.substring(0, 8)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Started: {formatTime(scan.started_at || scan.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsFlowModalOpen(true)}
              className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-semibold transition-all flex items-center space-x-1.5 shadow-sm"
              title="Open full animated step-by-step pipeline view"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Pipeline Flow</span>
              <Maximize2 className="w-3 h-3 text-cyan-400" />
            </button>

            {getScanStatusBadge(scan.status)}

            {isActive && (
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
          </div>
        </div>

        {/* Mini Animated Pipeline Step Flow Bar */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Orchestrated Flow Overview</span>
            </span>
            <span className="text-cyan-400">
              {modules.filter((m) => m.status === ModuleStatus.COMPLETED).length} / {modules.length || 5} Completed
            </span>
          </div>

          {/* Stepper Node Circles */}
          <div className="flex items-center justify-between relative px-2">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-0">
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-400 animate-flow-laser" />
              )}
            </div>

            {modules.map((m) => {
              const Icon = getModuleIcon(m.module_type);
              const isModRunning = m.status === ModuleStatus.RUNNING;
              const isModCompleted = m.status === ModuleStatus.COMPLETED;
              const isModSkipped = m.status === ModuleStatus.SKIPPED;

              return (
                <div
                  key={m.id}
                  className="flex flex-col items-center space-y-1 z-10 cursor-pointer"
                  onClick={() => setIsFlowModalOpen(true)}
                  title={`${m.module_type}: ${m.status}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                      isModRunning
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/40 animate-pulse'
                        : isModCompleted
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : isModSkipped
                        ? 'bg-slate-800 border-slate-700 text-slate-500'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {isModRunning ? (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    ) : isModCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    {m.module_type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Summary Bar */}
        {scan.severity_summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <span className="text-[10px] text-rose-400 font-medium block">CRITICAL</span>
              <span className="text-lg font-bold text-rose-300 font-mono">
                {scan.severity_summary.CRITICAL || 0}
              </span>
            </div>
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span className="text-[10px] text-amber-400 font-medium block">HIGH</span>
              <span className="text-lg font-bold text-amber-300 font-mono">
                {scan.severity_summary.HIGH || 0}
              </span>
            </div>
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <span className="text-[10px] text-yellow-400 font-medium block">MEDIUM</span>
              <span className="text-lg font-bold text-yellow-300 font-mono">
                {scan.severity_summary.MEDIUM || 0}
              </span>
            </div>
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <span className="text-[10px] text-cyan-400 font-medium block">LOW</span>
              <span className="text-lg font-bold text-cyan-300 font-mono">
                {scan.severity_summary.LOW || 0}
              </span>
            </div>
            <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl">
              <span className="text-[10px] text-slate-400 font-medium block">INFO</span>
              <span className="text-lg font-bold text-slate-300 font-mono">
                {scan.severity_summary.INFO || 0}
              </span>
            </div>
          </div>
        )}

        {/* Modules Progress Breakdown */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Security Modules Execution ({modules.length})</span>
            </h4>
            <button
              onClick={() => setIsFlowModalOpen(true)}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center space-x-1"
            >
              <span>View Full Flow & Console</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="space-y-2">
            {modules.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-semibold text-slate-200">{m.module_type}</span>
                  {m.skip_reason && (
                    <span className="text-[11px] text-slate-500 italic truncate max-w-[280px]">
                      ({m.skip_reason})
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {m.findings_count > 0 && (
                    <span className="text-cyan-400 font-mono text-xs font-semibold">
                      {m.findings_count} findings
                    </span>
                  )}
                  {m.execution_time_ms > 0 && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {m.execution_time_ms} ms
                    </span>
                  )}
                  {getModuleStatusBadge(m.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Flow Execution Modal */}
      {isFlowModalOpen && (
        <Modal
          isOpen={isFlowModalOpen}
          onClose={() => setIsFlowModalOpen(false)}
          title={`Security Scan Pipeline Execution ${projectName ? `— ${projectName}` : ''}`}
          maxWidth="max-w-4xl"
        >
          <ScanExecutionFlow
            scan={scan}
            projectId={scan.project_id}
            projectName={projectName}
            onClose={() => setIsFlowModalOpen(false)}
            onViewFindings={onViewFindings}
            onDownloadPdf={onDownloadPdf}
          />
        </Modal>
      )}
    </>
  );
};
