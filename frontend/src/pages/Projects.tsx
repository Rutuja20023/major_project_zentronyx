import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/project.service';
import { useToast } from '../context/ToastContext';
import { Project } from '../types/project.types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatDate } from '../lib/dateUtils';
import {
  FolderGit2,
  Plus,
  Search,
  GitBranch,
  Calendar,
  Shield,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to load projects', err);
      showToast(err.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      const newProj = await projectService.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        repository_url: repositoryUrl.trim() || undefined,
      });
      showToast(`Project "${newProj.name}" created successfully!`, 'success');
      setName('');
      setDescription('');
      setRepositoryUrl('');
      setIsCreateModalOpen(false);
      navigate(`/projects/${newProj.id}`);
    } catch (err: any) {
      console.error('Failed to create project', err);
      showToast(err.message || 'Failed to create project', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      await projectService.deleteProject(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      showToast(`Project "${projectToDelete.name}" deleted successfully`, 'success');
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete project', err);
      if (err.status === 404 || err.message?.includes('not found') || err.message?.includes('Not Found')) {
        setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
        showToast(`Project "${projectToDelete.name}" was already removed.`, 'info');
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
      } else {
        showToast(err.message || 'Failed to delete project', 'error');
      }
    } finally {
      setDeleting(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <LoadingSpinner label="Fetching security projects..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-cyan-400" />
            <span>Security Projects</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered codebases and security targets for automated scanning & vulnerability detection.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Project
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Filter projects by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 className="w-8 h-8 text-cyan-400" />}
          title="No Security Projects Found"
          description={searchTerm ? "No projects match your search criteria." : "Create your first project to configure security targets."}
          actionLabel="Create Project"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              glow="cyan"
              onClick={() => navigate(`/projects/${project.id}`)}
              className="flex flex-col justify-between cursor-pointer group hover:border-cyan-500/40 transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 group-hover:scale-105 transition-transform">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-100 truncate max-w-[150px] group-hover:text-cyan-400 transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge riskLevel={project.risk_level} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project);
                        setIsDeleteModalOpen(true);
                      }}
                      title="Delete project"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4 h-8">
                  {project.description || 'No description added for this security target.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                {project.repository_url && (
                  <div className="flex items-center space-x-2 text-slate-400 truncate">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{project.repository_url}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono pt-1">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(project.created_at)}</span>
                  </span>
                  <span className="text-cyan-400 font-semibold uppercase">{project.status}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Security Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payment Gateway API"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief scope or target details..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Repository URL (Optional)
            </label>
            <input
              type="url"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={creating}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!deleting) {
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
          }
        }}
        title="Delete Security Project"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-rose-300">Warning:</span> Are you sure you want to delete project <strong className="text-slate-100">{projectToDelete?.name}</strong>?
              This will permanently purge all scans, findings, source archives, and analysis reports associated with this project. This action cannot be undone.
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              disabled={deleting}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setProjectToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleting}
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleConfirmDelete}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
