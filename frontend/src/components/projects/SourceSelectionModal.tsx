import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ZipUploadForm } from './ZipUploadForm';
import { GitHubIngestForm } from './GitHubIngestForm';
import { FileArchive, Github } from 'lucide-react';
import { Source } from '../../types/source.types';

interface SourceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSourceAcquired: (source: Source) => void;
}

export const SourceSelectionModal: React.FC<SourceSelectionModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSourceAcquired,
}) => {
  const [activeTab, setActiveTab] = useState<'zip' | 'github'>('zip');

  const handleSuccess = (source: Source) => {
    onSourceAcquired(source);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Acquire Source Code Target">
      <div className="space-y-4">
        {/* Tab Buttons */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('zip')}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'zip'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            <span>Upload ZIP Archive</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'github'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repository</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'zip' ? (
          <ZipUploadForm
            projectId={projectId}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        ) : (
          <GitHubIngestForm
            projectId={projectId}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        )}
      </div>
    </Modal>
  );
};
