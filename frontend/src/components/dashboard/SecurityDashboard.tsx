import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  FileText,
  Download,
  Activity,
  Cpu,
  BarChart2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../common/Button';
import { reportService } from '../../services/report.service';

interface SecurityDashboardProps {
  projectId: string;
  scanId?: string;
  riskScore: number;
  riskLevel: string;
  policyDecision?: 'PASS' | 'WARN' | 'BLOCK';
  severitySummary?: Record<string, number>;
  onDownloadPdf?: () => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  projectId,
  scanId,
  riskScore,
  riskLevel,
  policyDecision = 'PASS',
  severitySummary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
  onDownloadPdf,
}) => {
  const getPolicyBadge = (decision: string) => {
    switch (decision) {
      case 'BLOCK':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertOctagon className="w-4 h-4" />
            <span>POLICY BLOCK</span>
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-4 h-4" />
            <span>POLICY WARNING</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <ShieldCheck className="w-4 h-4" />
            <span>POLICY PASS</span>
          </span>
        );
    }
  };

  const handlePdfDownload = async () => {
    if (!scanId) return;
    try {
      await reportService.downloadPdfReport(scanId);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download PDF report.');
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Executive Security Risk Dashboard</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparent Risk Formula & Automated Policy Evaluation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getPolicyBadge(policyDecision)}
          {scanId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDownloadPdf || handlePdfDownload}
              leftIcon={<Download className="w-4 h-4 text-cyan-400" />}
            >
              Export PDF Report
            </Button>
          )}
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Risk Score */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Overall Risk Score
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black font-mono text-cyan-400">{riskScore} / 100</span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
              riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
              riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {riskLevel}
            </span>
          </div>
        </div>

        {/* Critical & High Counts */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Critical Vulnerabilities
          </span>
          <p className="text-2xl font-black font-mono text-rose-400 pt-1">
            {severitySummary.CRITICAL || 0}
          </p>
        </div>

        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            High Vulnerabilities
          </span>
          <p className="text-2xl font-black font-mono text-amber-400 pt-1">
            {severitySummary.HIGH || 0}
          </p>
        </div>

        {/* Medium / Low */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Medium & Low
          </span>
          <p className="text-2xl font-black font-mono text-slate-200 pt-1">
            {(severitySummary.MEDIUM || 0) + (severitySummary.LOW || 0)}
          </p>
        </div>
      </div>
    </div>
  );
};
