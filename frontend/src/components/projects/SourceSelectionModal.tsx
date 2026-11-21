import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ZipUploadForm } from './ZipUploadForm';
import { FolderUploadForm } from './FolderUploadForm';
import { GitHubIngestForm } from './GitHubIngestForm';
import { FileArchive, Folder, Github } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'folder' | 'zip' | 'github'>('folder');

  const handleSuccess = (source: Source) => {
    onSourceAcquired(source);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Acquire Source Code Target">
      <div className="space-y-4">
        {/* Tab Buttons: Normal Folder, ZIP Archive, GitHub Repository */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('folder')}
            className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'folder'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Folder className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Normal Folder</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('zip')}
            className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'zip'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ZIP Archive</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'github'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Github className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">GitHub Link</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'folder' && (
          <FolderUploadForm
            projectId={projectId}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        )}
        {activeTab === 'zip' && (
          <ZipUploadForm
            projectId={projectId}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        )}
        {activeTab === 'github' && (
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
