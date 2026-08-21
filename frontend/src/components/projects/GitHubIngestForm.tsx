import React, { useState } from 'react';
import { GitBranch, Github, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { sourceService } from '../../services/source.service';
import { Source } from '../../types/source.types';

interface GitHubIngestFormProps {
  projectId: string;
  onSuccess: (source: Source) => void;
  onCancel: () => void;
}

export const GitHubIngestForm: React.FC<GitHubIngestFormProps> = ({
  projectId,
  onSuccess,
  onCancel,
}) => {
  const [repositoryUrl, setRepositoryUrl] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const validateUrl = (url: string): boolean => {
    const trimmed = url.trim();
    return (
      trimmed.startsWith('https://github.com/') ||
      trimmed.startsWith('http://github.com/')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(repositoryUrl)) {
      setError('Please provide a valid GitHub repository URL (https://github.com/owner/repository)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStatusMessage('Validating GitHub repository URL & SSRF security checks...');

      const source = await sourceService.ingestGitHubSource(projectId, {
        repository_url: repositoryUrl.trim(),
        branch: branch.trim() || undefined,
      });

      setStatusMessage('Cloning repository into isolated workspace...');
      onSuccess(source);
    } catch (err: any) {
      console.error('GitHub ingestion error:', err);
      setError(err.message || 'Failed to clone repository from GitHub.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
          <span>GitHub Repository URL <span className="text-rose-400">*</span></span>
          <span className="text-[10px] text-cyan-400 flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 inline" />
            <span>SSRF Protected</span>
          </span>
        </label>
        <div className="relative">
          <Github className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="url"
            required
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/org/repository"
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          Branch Name (Optional)
        </label>
        <div className="relative">
          <GitBranch className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="e.g. main, master, or release/v1.0"
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {loading && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center space-x-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
        <Button variant="secondary" size="sm" type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" isLoading={loading} disabled={!repositoryUrl.trim()}>
          Clone & Ingest Repo
        </Button>
      </div>
    </form>
  );
};
