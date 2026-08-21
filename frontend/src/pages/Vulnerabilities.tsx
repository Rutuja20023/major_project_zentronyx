import React, { useEffect, useState } from 'react';
import {
  Bug,
  Filter,
  Search,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  FileCode,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { projectService } from '../services/project.service';
import { scanService } from '../services/scan.service';
import { Project } from '../types/project.types';
import { ScanResult, FindingSeverity, ModuleType } from '../types/scan.types';

export const Vulnerabilities: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [results, setResults] = useState<(ScanResult & { projectName?: string })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Selected Detail Modal
  const [activeFinding, setActiveFinding] = useState<(ScanResult & { projectName?: string }) | null>(null);

  const fetchVulnerabilities = async () => {
    setLoading(true);
    try {
      const projList = await projectService.getProjects();
      setProjects(projList);

      const allResults: (ScanResult & { projectName?: string })[] = [];

      const targetProjects =
        selectedProjectId === 'ALL'
          ? projList
          : projList.filter((p) => p.id === selectedProjectId);

      for (const proj of targetProjects) {
        try {
          const scans = await scanService.getProjectScans(proj.id);
          for (const scan of scans) {
            try {
              const resList = await scanService.getScanResults(scan.id);
              resList.forEach((r) => {
                allResults.push({
                  ...r,
                  projectName: proj.name,
                });
              });
            } catch {
              // ignore single scan results failure
            }
          }
        } catch {
          // ignore project scans failure
        }
      }

      setResults(allResults);
    } catch (err) {
      console.error('Failed to load vulnerabilities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulnerabilities();
  }, [selectedProjectId]);

  const filtered = results.filter((r) => {
    const matchSearch =
      search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.scanner.toLowerCase().includes(search.toLowerCase()) ||
      (r.file && r.file.toLowerCase().includes(search.toLowerCase())) ||
      (r.rule_id && r.rule_id.toLowerCase().includes(search.toLowerCase()));

    const matchSev = selectedSeverity === 'ALL' || r.severity === selectedSeverity;
    const matchMod = selectedModule === 'ALL' || r.module_type === selectedModule;
    const matchStat = selectedStatus === 'ALL' || (r.raw_metadata?.status || 'OPEN') === selectedStatus;

    return matchSearch && matchSev && matchMod && matchStat;
  });

  // Severity counts
  const critCount = results.filter((r) => r.severity === FindingSeverity.CRITICAL).length;
  const highCount = results.filter((r) => r.severity === FindingSeverity.HIGH).length;
  const medCount = results.filter((r) => r.severity === FindingSeverity.MEDIUM).length;
  const lowCount = results.filter((r) => r.severity === FindingSeverity.LOW || r.severity === FindingSeverity.INFO).length;

  const handleUpdateFindingStatus = (findingId: string, newStatus: string) => {
    setResults((prev) =>
      prev.map((r) => {
        if (r.id === findingId) {
          return {
            ...r,
            raw_metadata: {
              ...r.raw_metadata,
              status: newStatus,
            },
          };
        }
        return r;
      })
    );
    if (activeFinding && activeFinding.id === findingId) {
      setActiveFinding({
        ...activeFinding,
        raw_metadata: {
          ...activeFinding.raw_metadata,
          status: newStatus,
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono">Platform Vulnerabilities & Security Findings</h1>
              <p className="text-xs text-slate-400">
                Centralized security findings triage, CWE rules, CVE vulnerabilities, and remediation workflows.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchVulnerabilities}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 flex items-center space-x-2 text-xs font-semibold self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Findings</span>
        </button>
      </div>

      {/* Severity Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedSeverity === 'CRITICAL'
              ? 'bg-rose-500/15 border-rose-500/60 ring-2 ring-rose-500/30'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono font-bold">
            <span>CRITICAL</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-rose-300 font-mono mt-1">{critCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Requires immediate remediation</div>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'HIGH' ? 'ALL' : 'HIGH')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedSeverity === 'HIGH'
              ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/30'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono font-bold">
            <span>HIGH</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono mt-1">{highCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">High exploit probability</div>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedSeverity === 'MEDIUM'
              ? 'bg-yellow-500/15 border-yellow-500/60 ring-2 ring-yellow-500/30'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-yellow-400 text-xs font-mono font-bold">
            <span>MEDIUM</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-yellow-300 font-mono mt-1">{medCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Moderate security flaw</div>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'LOW' ? 'ALL' : 'LOW')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedSeverity === 'LOW'
              ? 'bg-cyan-500/15 border-cyan-500/60 ring-2 ring-cyan-500/30'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-400 text-xs font-mono font-bold">
            <span>LOW / INFO</span>
            <Info className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono mt-1">{lowCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Informational advisory</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, rule ID, path, scanner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto text-xs">
            {/* Project Select */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Scanner Module Select */}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Scanner Modules</option>
              <option value="SAST">SAST (Semgrep)</option>
              <option value="SCA">SCA (OSV Vulnerabilities)</option>
              <option value="DAST">DAST (OWASP ZAP)</option>
              <option value="BINARY_ANALYSIS">Binary Analysis (Ghidra)</option>
              <option value="GNN">GNN Malware Detector</option>
            </select>

            {/* Status Select */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Triage Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vulnerabilities Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Vulnerabilities Registry ({filtered.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
            <p>Loading security vulnerability findings across projects...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-slate-200 font-semibold">No Security Vulnerabilities Found</p>
            <p className="text-slate-500">No findings match the selected filters or projects have clean security scans.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Vulnerability Title</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Scanner Engine</th>
                  <th className="p-3">File Location</th>
                  <th className="p-3">Triage Status</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((item) => {
                  const itemStatus = item.raw_metadata?.status || 'OPEN';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setActiveFinding(item)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        {item.severity === FindingSeverity.CRITICAL && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                            CRITICAL
                          </span>
                        )}
                        {item.severity === FindingSeverity.HIGH && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                            HIGH
                          </span>
                        )}
                        {item.severity === FindingSeverity.MEDIUM && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-mono">
                            MEDIUM
                          </span>
                        )}
                        {(item.severity === FindingSeverity.LOW || item.severity === FindingSeverity.INFO) && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                            LOW
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-100 hover:text-cyan-400 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {item.rule_id || item.category || 'VULN-RULE'}
                        </div>
                      </td>

                      <td className="p-3 text-slate-300 font-medium">
                        {item.projectName || 'Project'}
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                          {item.module_type} ({item.scanner})
                        </span>
                      </td>

                      <td className="p-3 font-mono text-[11px] text-slate-400 max-w-[200px] truncate">
                        {item.file ? (
                          <span title={item.file}>
                            {item.file}:{item.line || 1}
                          </span>
                        ) : (
                          <span className="text-slate-600">N/A</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            itemStatus === 'RESOLVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : itemStatus === 'FALSE_POSITIVE'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : itemStatus === 'ACKNOWLEDGED'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {itemStatus}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button className="p-1 text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-700 rounded transition-all">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Finding Details Drawer / Modal */}
      {activeFinding && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                    {activeFinding.severity}
                  </span>
                  <h3 className="text-base font-bold text-slate-100">{activeFinding.title}</h3>
                </div>
                <p className="text-xs font-mono text-cyan-400">
                  {activeFinding.rule_id} • {activeFinding.scanner} ({activeFinding.module_type})
                </p>
              </div>
              <button
                onClick={() => setActiveFinding(null)}
                className="p-1 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
              {/* Description */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-400 font-mono uppercase text-[10px]">Description & Threat Detail</h4>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl leading-relaxed">
                  {activeFinding.description}
                </div>
              </div>

              {/* File & Code Location */}
              {activeFinding.file && (
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-400 font-mono uppercase text-[10px]">Target File & Evidence</h4>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-cyan-300 flex items-center space-x-2">
                    <FileCode className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>
                      {activeFinding.file}:{activeFinding.line || 1}
                    </span>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-400 font-mono uppercase text-[10px]">Remediation & Fix Advisory</h4>
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-200 leading-relaxed">
                  {activeFinding.recommendation || 'Apply strict input sanitization, check function privileges, and update third-party library dependencies.'}
                </div>
              </div>

              {/* Triage Actions */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400 font-mono">Triage Workflow Status:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUpdateFindingStatus(activeFinding.id, 'RESOLVED')}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-mono text-xs font-semibold transition-all"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleUpdateFindingStatus(activeFinding.id, 'ACKNOWLEDGED')}
                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg font-mono text-xs font-semibold transition-all"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => handleUpdateFindingStatus(activeFinding.id, 'FALSE_POSITIVE')}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg font-mono text-xs font-semibold transition-all"
                  >
                    False Positive
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
