import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  XCircle,
  Download,
  Eye,
  Activity,
} from 'lucide-react';
import { projectService } from '../services/project.service';
import { scanService } from '../services/scan.service';
import { reportService } from '../services/report.service';
import { Project } from '../types/project.types';
import { Scan, ScanStatus, ScanResult, ModuleType } from '../types/scan.types';
import { ScanPlanModal } from '../components/scans/ScanPlanModal';
import { FindingExplorer } from '../components/findings/FindingExplorer';
import { ScanProgressCard } from '../components/scans/ScanProgressCard';
import { useToast } from '../context/ToastContext';

export const SecurityScans: React.FC = () => {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [scans, setScans] = useState<(Scan & { projectName?: string })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [targetProjectForModal, setTargetProjectForModal] = useState<Project | null>(null);
  
  // Results Drawer State
  const [selectedScanResults, setSelectedScanResults] = useState<{
    scanId: string;
    projectName: string;
    results: ScanResult[];
  } | null>(null);
  const [loadingResults, setLoadingResults] = useState<boolean>(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const projList = await projectService.getProjects();
      setProjects(projList);

      const allScans: (Scan & { projectName?: string })[] = [];
      
      const projectsToFetch =
        selectedProjectId === 'ALL'
          ? projList
          : projList.filter((p) => p.id === selectedProjectId);

      for (const proj of projectsToFetch) {
        try {
          const projScans = await scanService.getProjectScans(proj.id);
          projScans.forEach((s) => {
            allScans.push({
              ...s,
              projectName: proj.name,
            });
          });
        } catch {
          // ignore single project scan fetch error
        }
      }

      // Sort scans by created_at desc
      allScans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setScans(allScans);
    } catch (err) {
      console.error('Failed to load security scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedProjectId]);

  const handleLaunchScanClick = (proj?: Project) => {
    if (proj) {
      setTargetProjectForModal(proj);
    } else if (projects.length > 0) {
      const p = projects.find((x) => x.id === selectedProjectId) || projects[0];
      setTargetProjectForModal(p);
    }
    setShowPlanModal(true);
  };

  const handleScanStarted = () => {
    setShowPlanModal(false);
    fetchAllData();
  };

  const handleViewResults = async (scan: Scan & { projectName?: string }) => {
    setLoadingResults(true);
    try {
      const results = await scanService.getScanResults(scan.id);
      setSelectedScanResults({
        scanId: scan.id,
        projectName: scan.projectName || 'Project',
        results,
      });
    } catch (err) {
      console.error('Failed to load scan findings:', err);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleDownloadPdf = async (scanId: string, projectName?: string) => {
    try {
      showToast('Generating enterprise PDF security report...', 'info');
      await reportService.downloadPdfReport(scanId, projectName || 'project');
      showToast('PDF report downloaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to generate PDF report. Ensure scan has completed successfully.', 'error');
    }
  };

  const handleCancelScan = async (scanId: string) => {
    if (!window.confirm('Are you sure you want to cancel this active security scan?')) return;
    try {
      await scanService.cancelScan(scanId);
      fetchAllData();
    } catch (err) {
      alert('Failed to cancel scan execution.');
    }
  };

  const filteredScans = scans.filter((s) => {
    const matchSearch =
      search === '' ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      (s.projectName && s.projectName.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeScansCount = scans.filter(
    (s) => s.status === ScanStatus.RUNNING || s.status === ScanStatus.QUEUED || s.status === ScanStatus.PREPARING
  ).length;

  const completedScansCount = scans.filter((s) => s.status === ScanStatus.COMPLETED).length;
  const totalFindings = scans.reduce((acc, s) => acc + (s.findings_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono">Security Scans Control Hub</h1>
              <p className="text-xs text-slate-400">
                Orchestrate multi-engine security scans (SAST, SCA, DAST, Binary Analysis & GNN Malware Detection).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAllData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
            title="Refresh Scans"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => handleLaunchScanClick()}
            disabled={projects.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Launch Security Scan</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TOTAL SCANS</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">{scans.length}</div>
          <div className="text-[11px] text-slate-500">Recorded scan runs across projects</div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>ACTIVE ORCHESTRATIONS</span>
            <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{activeScansCount}</div>
          <div className="text-[11px] text-slate-500">Currently executing scanners</div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>COMPLETED SCANS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{completedScansCount}</div>
          <div className="text-[11px] text-slate-500">Successfully finalized scans</div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TOTAL FINDINGS DETECTED</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{totalFindings}</div>
          <div className="text-[11px] text-slate-500">Normalized security vulnerabilities</div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Project Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">Project:</span>
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
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="RUNNING">RUNNING</option>
              <option value="QUEUED">QUEUED</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Scan ID or Project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Active Scans Section */}
      {scans.filter((s) => s.status === ScanStatus.RUNNING || s.status === ScanStatus.QUEUED || s.status === ScanStatus.PREPARING).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center space-x-2">
            <Activity className="w-4 h-4 animate-pulse text-amber-400" />
            <span>Active Scan Executions</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scans
              .filter((s) => s.status === ScanStatus.RUNNING || s.status === ScanStatus.QUEUED || s.status === ScanStatus.PREPARING)
              .map((activeScan) => (
                <ScanProgressCard
                  key={activeScan.id}
                  scan={activeScan}
                  onRefresh={fetchAllData}
                />
              ))}
          </div>
        </div>
      )}

      {/* Scans List Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Scan History & Orchestration Log ({filteredScans.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
            <p>Loading security scan history...</p>
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No Security Scans Found</p>
            <p className="text-slate-500">Launch a new security scan for any project to begin vulnerability analysis.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Project & Scan ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Findings</th>
                  <th className="p-3">Severity Breakdown</th>
                  <th className="p-3">Execution Time</th>
                  <th className="p-3">Started At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredScans.map((scan) => {
                  const isRunning =
                    scan.status === ScanStatus.RUNNING ||
                    scan.status === ScanStatus.QUEUED ||
                    scan.status === ScanStatus.PREPARING;
                  const isCompleted = scan.status === ScanStatus.COMPLETED;

                  return (
                    <tr key={scan.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-100">{scan.projectName || 'Project'}</div>
                        <div className="text-[10px] font-mono text-cyan-400/80">{scan.id}</div>
                      </td>

                      <td className="p-3">
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            COMPLETED
                          </span>
                        )}
                        {isRunning && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            RUNNING
                          </span>
                        )}
                        {scan.status === ScanStatus.FAILED && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            FAILED
                          </span>
                        )}
                        {scan.status === ScanStatus.CANCELLED && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            CANCELLED
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-100">
                        {scan.findings_count || 0}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded">
                            C:{scan.severity_summary?.CRITICAL || 0}
                          </span>
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">
                            H:{scan.severity_summary?.HIGH || 0}
                          </span>
                          <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 rounded">
                            M:{scan.severity_summary?.MEDIUM || 0}
                          </span>
                          <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">
                            L:{scan.severity_summary?.LOW || 0}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-slate-400">
                        {scan.started_at && scan.finished_at
                          ? `${Math.round((new Date(scan.finished_at).getTime() - new Date(scan.started_at).getTime()) / 1000)}s`
                          : isRunning
                          ? 'In progress'
                          : 'N/A'}
                      </td>

                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(scan.created_at).toLocaleString()}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewResults(scan)}
                            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-[11px] font-medium transition-all flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Findings</span>
                          </button>

                          {isCompleted && (
                            <button
                              onClick={() => handleDownloadPdf(scan.id, scan.projectName)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-medium transition-all flex items-center space-x-1"
                              title="Download PDF Report"
                            >
                              <Download className="w-3 h-3 text-emerald-400" />
                              <span>PDF</span>
                            </button>
                          )}

                          {isRunning && (
                            <button
                              onClick={() => handleCancelScan(scan.id)}
                              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[11px] font-medium transition-all flex items-center space-x-1"
                              title="Cancel Scan"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Findings Drawer Modal */}
      {selectedScanResults && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Findings for {selectedScanResults.projectName}
                </h3>
                <p className="text-xs text-slate-400">Scan ID: {selectedScanResults.scanId}</p>
              </div>
              <button
                onClick={() => setSelectedScanResults(null)}
                className="p-1 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <FindingExplorer results={selectedScanResults.results} />
            </div>
          </div>
        </div>
      )}

      {/* Launch Scan Modal */}
      {showPlanModal && targetProjectForModal && (
        <ScanPlanModal
          isOpen={showPlanModal}
          projectId={targetProjectForModal.id}
          analysis={null}
          onClose={() => setShowPlanModal(false)}
          onScanCreated={handleScanStarted}
        />
      )}
    </div>
  );
};
