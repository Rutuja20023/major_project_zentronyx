import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Info,
  FileCode,
  CheckCircle2,
  Filter,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { ScanResult, FindingSeverity } from '../../types/scan.types';

interface ScanResultsViewProps {
  results: ScanResult[];
}

export const ScanResultsView: React.FC<ScanResultsViewProps> = ({ results }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  const filteredResults = results.filter((r) => {
    const matchSev = selectedSeverity === 'ALL' || r.severity === selectedSeverity;
    const matchMod = selectedModule === 'ALL' || r.module_type === selectedModule;
    return matchSev && matchMod;
  });

  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case FindingSeverity.CRITICAL:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
            <AlertOctagon className="w-3 h-3" />
            <span>CRITICAL</span>
          </span>
        );
      case FindingSeverity.HIGH:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
            <AlertTriangle className="w-3 h-3" />
            <span>HIGH</span>
          </span>
        );
      case FindingSeverity.MEDIUM:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-mono">
            <Info className="w-3 h-3" />
            <span>MEDIUM</span>
          </span>
        );
      case FindingSeverity.LOW:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
            <span>LOW</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-300">Filter Findings:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Buttons */}
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                selectedSeverity === sev
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      {filteredResults.length === 0 ? (
        <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-200">No Findings Match Filter</h4>
          <p className="text-xs text-slate-400">Try adjusting your severity or module filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((finding) => (
            <div
              key={finding.id}
              className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  {getSeverityBadge(finding.severity)}
                  <h4 className="text-sm font-bold text-slate-100">{finding.title}</h4>
                </div>

                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {finding.module_type}
                  </span>
                  <span className="text-slate-500">({finding.scanner})</span>
                </div>
              </div>

              <p className="text-xs text-slate-300">{finding.description}</p>

              {/* Location & Recommendation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                {finding.file && (
                  <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px] truncate">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {finding.file}
                      {finding.line ? `:${finding.line}` : ''}
                      {finding.column ? `:${finding.column}` : ''}
                    </span>
                  </div>
                )}

                {finding.recommendation && (
                  <div className="flex items-start space-x-1.5 text-emerald-300 text-[11px] bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{finding.recommendation}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
