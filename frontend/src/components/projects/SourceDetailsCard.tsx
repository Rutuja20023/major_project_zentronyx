import React, { useState } from 'react';
import {
  FileArchive,
  Github,
  GitBranch,
  GitCommit,
  Clock,
  HardDrive,
  Fingerprint,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Source, AcquisitionStatus } from '../../types/source.types';
import { Button } from '../common/Button';

interface SourceDetailsCardProps {
  source: Source;
  onDelete: (sourceId: string) => Promise<void>;
}

export const SourceDetailsCard: React.FC<SourceDetailsCardProps> = ({ source, onDelete }) => {
  const [deleting, setDeleting] = useState<boolean>(false);

  const getStatusBadge = (status: AcquisitionStatus) => {
    switch (status) {
      case AcquisitionStatus.READY:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>READY</span>
          </span>
        );
      case AcquisitionStatus.FAILED:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{status}</span>
          </span>
        );
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this source artifact from project workspace?')) {
      try {
        setDeleting(true);
        await onDelete(source.id);
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            {source.source_type === 'GITHUB' ? (
              <Github className="w-5 h-5" />
            ) : (
              <FileArchive className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>{source.original_filename || source.source_url || 'Source Artifact'}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {source.source_type}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {source.id}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getStatusBadge(source.acquisition_status)}
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={deleting}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Remove
          </Button>
        </div>
      </div>

      {source.error_message && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-mono">
          <p className="font-semibold mb-1">Acquisition Error:</p>
          <p className="whitespace-pre-wrap">{source.error_message}</p>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {source.branch && (
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block flex items-center space-x-1">
              <GitBranch className="w-3 h-3 text-slate-400 inline" />
              <span>Target Branch</span>
            </span>
            <span className="font-mono text-slate-200 text-xs font-semibold">{source.branch}</span>
          </div>
        )}

        {source.commit_hash && (
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block flex items-center space-x-1">
              <GitCommit className="w-3 h-3 text-slate-400 inline" />
              <span>Commit Hash</span>
            </span>
            <span className="font-mono text-cyan-400 text-xs font-semibold truncate block">
              {source.commit_hash.substring(0, 12)}
            </span>
          </div>
        )}

        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block flex items-center space-x-1">
            <HardDrive className="w-3 h-3 text-slate-400 inline" />
            <span>Payload Size</span>
          </span>
          <span className="font-mono text-slate-200 text-xs font-semibold">
            {(source.file_size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>

        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block flex items-center space-x-1">
            <Clock className="w-3 h-3 text-slate-400 inline" />
            <span>Acquired At</span>
          </span>
          <span className="font-mono text-slate-200 text-xs">
            {source.acquired_at
              ? new Date(source.acquired_at).toLocaleString()
              : new Date(source.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {source.source_fingerprint && (
        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 p-2 bg-slate-950/40 rounded-lg border border-slate-800/50 truncate">
          <Fingerprint className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400 shrink-0">SHA-256 Fingerprint:</span>
          <span className="text-slate-300 truncate">{source.source_fingerprint}</span>
        </div>
      )}
    </div>
  );
};
