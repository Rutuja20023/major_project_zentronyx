import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Loader2,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Scan, ScanModule, ScanStatus, ModuleStatus } from '../../types/scan.types';
import { scanService } from '../../services/scan.service';
import { Button } from '../common/Button';

interface ScanProgressCardProps {
  scan: Scan;
  onRefresh: () => void;
}

export const ScanProgressCard: React.FC<ScanProgressCardProps> = ({ scan, onRefresh }) => {
  const [modules, setModules] = useState<ScanModule[]>([]);
  const [cancelling, setCancelling] = useState<boolean>(false);

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
    // Poll every 3 seconds if active scan is running
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
      }, 3000);
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-base font-bold text-slate-100">Scan Execution</h3>
              <span className="text-xs text-slate-400 font-mono">ID: {scan.id.substring(0, 8)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Started: {scan.started_at ? new Date(scan.started_at).toLocaleTimeString() : new Date(scan.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getScanStatusBadge(scan.status)}
          {isActive && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              isLoading={cancelling}
              leftIcon={<Ban className="w-3.5 h-3.5" />}
            >
              Cancel Scan
            </Button>
          )}
        </div>
      </div>

      {/* Severity Summary Bar */}
      {scan.severity_summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            <span className="text-[10px] text-rose-400 font-medium block">CRITICAL</span>
            <span className="text-lg font-bold text-rose-300 font-mono">{scan.severity_summary.CRITICAL || 0}</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <span className="text-[10px] text-amber-400 font-medium block">HIGH</span>
            <span className="text-lg font-bold text-amber-300 font-mono">{scan.severity_summary.HIGH || 0}</span>
          </div>
          <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <span className="text-[10px] text-yellow-400 font-medium block">MEDIUM</span>
            <span className="text-lg font-bold text-yellow-300 font-mono">{scan.severity_summary.MEDIUM || 0}</span>
          </div>
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <span className="text-[10px] text-cyan-400 font-medium block">LOW</span>
            <span className="text-lg font-bold text-cyan-300 font-mono">{scan.severity_summary.LOW || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium block">INFO</span>
            <span className="text-lg font-bold text-slate-300 font-mono">{scan.severity_summary.INFO || 0}</span>
          </div>
        </div>
      )}

      {/* Modules Progress Breakdown */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Security Modules Execution ({modules.length})</span>
        </h4>

        <div className="space-y-2">
          {modules.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs"
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
  );
};
