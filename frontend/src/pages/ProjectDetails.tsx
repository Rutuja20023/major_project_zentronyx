import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderGit2,
  ArrowLeft,
  Plus,
  Shield,
  Trash2,
  Edit,
  GitBranch,
  Calendar,
  Layers,
  AlertCircle,
  AlertTriangle,
  Cpu,
  Play,
  Activity,
  GitCompare,
  Download
} from 'lucide-react';
import { projectService } from '../services/project.service';
import { useToast } from '../context/ToastContext';
import { sourceService } from '../services/source.service';
import { analysisService } from '../services/analysis.service';
import { scanService } from '../services/scan.service';
import { reportService } from '../services/report.service';
import { Project } from '../types/project.types';
import { Source } from '../types/source.types';
import { ProjectAnalysis } from '../types/analysis.types';
import { Scan, ScanResult, ScanStatus } from '../types/scan.types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { SourceDetailsCard } from '../components/projects/SourceDetailsCard';
import { SourceSelectionModal } from '../components/projects/SourceSelectionModal';
import { TechnologyAnalysisCard } from '../components/projects/TechnologyAnalysisCard';
import { ScanPlanModal } from '../components/scans/ScanPlanModal';
import { ScanProgressCard } from '../components/scans/ScanProgressCard';
import { SecurityDashboard } from '../components/dashboard/SecurityDashboard';
import { FindingExplorer } from '../components/findings/FindingExplorer';
import { ScanComparisonModal } from '../components/scans/ScanComparisonModal';

export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScanResults, setSelectedScanResults] = useState<ScanResult[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [isScanPlanModalOpen, setIsScanPlanModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingProject, setDeletingProject] = useState<boolean>(false);

  // Edit form state
  const [editName, setEditName] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editRepo, setEditRepo] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchAllData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);

      const [projData, sourcesData, scansData] = await Promise.all([
        projectService.getProjectById(projectId),
        sourceService.getSources(projectId),
        scanService.getProjectScans(projectId),
      ]);

      setProject(projData);
      setSources(sourcesData);
      setScans(scansData);

      setEditName(projData.name);
      setEditDesc(projData.description || '');
      setEditRepo(projData.repository_url || '');

      // Fetch latest analysis
      try {
        const analysisData = await analysisService.getLatestAnalysis(projectId);
        setAnalysis(analysisData);
      } catch (err) {
        setAnalysis(null);
      }

      // If scans exist, fetch findings for the latest scan
      if (scansData.length > 0) {
        const latestScan = scansData[0];
        setSelectedScanId(latestScan.id);
        const results = await scanService.getScanResults(latestScan.id);
        setSelectedScanResults(results);
      }
    } catch (err: any) {
      console.error('Failed to load project workspace:', err);
      setError(err.message || 'Failed to retrieve project workspace details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [projectId]);

  const handleRunAnalysis = async () => {
    if (!projectId) return;
    try {
      setAnalyzing(true);
      const result = await analysisService.triggerAnalysis(projectId);
      setAnalysis(result);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      alert(err.message || 'Project analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectScanResults = async (scanId: string) => {
    try {
      setSelectedScanId(scanId);
      const results = await scanService.getScanResults(scanId);
      setSelectedScanResults(results);
    } catch (err) {
      console.error('Failed to load scan findings:', err);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedScanId) return;
    try {
      showToast('Generating enterprise PDF security report...', 'info');
      await reportService.downloadPdfReport(selectedScanId, project?.name || 'project');
      showToast('PDF report downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF download error:', err);
      showToast('Failed to download PDF report.', 'error');
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !editName.trim()) return;

    try {
      setUpdating(true);
      const updated = await projectService.updateProject(projectId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        repository_url: editRepo.trim() || undefined,
      });
      setProject(updated);
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Project update failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectId) return;
    try {
      setDeletingProject(true);
      await projectService.deleteProject(projectId);
      showToast(`Project "${project?.name}" deleted successfully`, 'success');
      navigate('/projects');
    } catch (err: any) {
      console.error('Project deletion failed:', err);
      if (err.status === 404 || err.message?.includes('not found') || err.message?.includes('Not Found')) {
        showToast('Project was already deleted', 'info');
        navigate('/projects');
      } else {
        showToast(err.message || 'Project deletion failed', 'error');
      }
    } finally {
      setDeletingProject(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!projectId) return;
    await sourceService.deleteSource(projectId, sourceId);
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
  };

  const activeScan = scans.find((s) =>
    [ScanStatus.CREATED, ScanStatus.QUEUED, ScanStatus.PREPARING, ScanStatus.RUNNING, ScanStatus.AGGREGATING].includes(s.status)
  );

  const selectedScan = scans.find((s) => s.id === selectedScanId);

  if (loading) {
    return <LoadingSpinner label="Loading project security workspace..." />;
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link to="/projects" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-cyan-400">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-100">Project Not Found</h2>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/projects"
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Projects</span>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-slate-100">{project.name}</h1>
                <Badge riskLevel={project.risk_level} />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">UUID: {project.id}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {scans.length > 1 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCompareModalOpen(true)}
              leftIcon={<GitCompare className="w-4 h-4 text-cyan-400" />}
            >
              Compare Scans
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunAnalysis}
            isLoading={analyzing}
            disabled={sources.length === 0}
            leftIcon={<Cpu className="w-4 h-4 text-cyan-400" />}
          >
            Analyze Project
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsScanPlanModalOpen(true)}
            disabled={sources.length === 0}
            leftIcon={<Play className="w-4 h-4" />}
          >
            Start Security Scan
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={<Edit className="w-4 h-4" />}
          >
            Edit
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Executive Security Risk Dashboard */}
      {selectedScan && (
        <SecurityDashboard
          projectId={project.id}
          scanId={selectedScan.id}
          riskScore={project.risk_score}
          riskLevel={project.risk_level}
          severitySummary={selectedScan.severity_summary}
          onDownloadPdf={handleDownloadPdf}
        />
      )}

      {/* Active Scan Progress */}
      {activeScan && (
        <ScanProgressCard
          scan={activeScan}
          onRefresh={async () => {
            const updatedScans = await scanService.getProjectScans(project.id);
            setScans(updatedScans);
            if (updatedScans.length > 0) {
              handleSelectScanResults(updatedScans[0].id);
            }
          }}
        />
      )}

      {/* Technology Analysis Section */}
      {analysis ? (
        <TechnologyAnalysisCard analysis={analysis} />
      ) : (
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">No Technology Analysis Performed</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Run project analysis to detect languages, frameworks, build tools, and entry points.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunAnalysis}
            isLoading={analyzing}
            disabled={sources.length === 0}
            leftIcon={<Cpu className="w-4 h-4" />}
          >
            Analyze Project
          </Button>
        </div>
      )}

      {/* Findings Explorer */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Unified Findings Explorer ({selectedScanResults.length})</span>
          </h2>

          {scans.length > 0 && (
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-slate-400">Selected Scan:</span>
              <select
                value={selectedScanId || ''}
                onChange={(e) => handleSelectScanResults(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              >
                {scans.map((s) => (
                  <option key={s.id} value={s.id}>
                    Scan #{s.id.substring(0, 8)} ({s.status}) - {s.findings_count} findings
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {scans.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-8 h-8 text-cyan-400" />}
            title="No Security Scans Conducted"
            description="Start a security scan to execute SAST, SCA, DAST, Binary Analysis, and GNN vulnerability scanners."
            actionLabel="Start Security Scan"
            onAction={() => setIsScanPlanModalOpen(true)}
          />
        ) : (
          <FindingExplorer results={selectedScanResults} />
        )}
      </div>

      {/* Acquired Source Targets */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
            <span>Acquired Source Code Targets ({sources.length})</span>
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSourceModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Source Target
          </Button>
        </div>

        {sources.length === 0 ? (
          <EmptyState
            icon={<FolderGit2 className="w-8 h-8 text-cyan-400" />}
            title="No Source Target Acquired"
            description="Upload a ZIP archive or clone a GitHub repository into this project's isolated workspace."
            actionLabel="Acquire Source Code"
            onAction={() => setIsSourceModalOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {sources.map((src) => (
              <SourceDetailsCard key={src.id} source={src} onDelete={handleDeleteSource} />
            ))}
          </div>
        )}
      </div>

      {/* Source Selection Modal */}
      {projectId && (
        <SourceSelectionModal
          isOpen={isSourceModalOpen}
          onClose={() => setIsSourceModalOpen(false)}
          projectId={projectId}
          onSourceAcquired={(newSource) => {
            setSources((prev) => [newSource, ...prev]);
            handleRunAnalysis();
          }}
        />
      )}

      {/* Scan Plan Modal */}
      {projectId && (
        <ScanPlanModal
          isOpen={isScanPlanModalOpen}
          onClose={() => setIsScanPlanModalOpen(false)}
          projectId={projectId}
          analysis={analysis}
          onScanCreated={(newScan) => {
            setScans((prev) => [newScan, ...prev]);
            setSelectedScanId(newScan.id);
          }}
        />
      )}

      {/* Scan Comparison Modal */}
      <ScanComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        scans={scans}
      />

      {/* Edit Project Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Project Metadata">
        <form onSubmit={handleUpdateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Repository URL</label>
            <input
              type="url"
              value={editRepo}
              onChange={(e) => setEditRepo(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={updating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!deletingProject) setIsDeleteModalOpen(false);
        }}
        title="Delete Security Project"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-rose-300">Warning:</span> Are you sure you want to delete project <strong className="text-slate-100">{project?.name}</strong>?
              This will permanently purge all scans, findings, source archives, and analysis reports associated with this project. This action cannot be undone.
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              disabled={deletingProject}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deletingProject}
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleConfirmDeleteProject}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
