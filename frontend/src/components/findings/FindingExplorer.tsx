import React, { useState } from 'react';
import {
  Filter,
  Search,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  FileCode,
  Tag,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import { ScanResult, FindingSeverity } from '../../types/scan.types';

interface FindingExplorerProps {
  results: ScanResult[];
  onUpdateStatus?: (resultId: string, status: string) => void;
}

export const FindingExplorer: React.FC<FindingExplorerProps> = ({ results, onUpdateStatus }) => {
  const [search, setSearch] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  const filtered = results.filter((r) => {
    const matchSearch =
      search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.file && r.file.toLowerCase().includes(search.toLowerCase()));

    const matchSev = selectedSeverity === 'ALL' || r.severity === selectedSeverity;
    const matchStat = selectedStatus === 'ALL' || (r.raw_metadata?.status || 'OPEN') === selectedStatus;
    const matchMod = selectedModule === 'ALL' || r.module_type === selectedModule;

    return matchSearch && matchSev && matchStat && matchMod;
  });

  const getSeverityBadge = (sev: FindingSeverity) => {
    switch (sev) {
      case FindingSeverity.CRITICAL:
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
            CRITICAL
          </span>
        );
      case FindingSeverity.HIGH:
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
            HIGH
          </span>
        );
      case FindingSeverity.MEDIUM:
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-mono">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, file path, rule ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Severity:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
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
      </div>

      {/* Findings List */}
      {filtered.length === 0 ? (
        <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-200">No Security Findings Match Filters</h4>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  {getSeverityBadge(item.severity)}
                  <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                </div>

                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {item.module_type}
                  </span>
                  <span className="text-slate-400">({item.scanner})</span>
                </div>
              </div>

              <p className="text-xs text-slate-300">{item.description}</p>

              {item.file && (
                <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px] pt-1">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">
                    {item.file}
                    {item.line ? `:${item.line}` : ''}
                    {item.column ? `:${item.column}` : ''}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
