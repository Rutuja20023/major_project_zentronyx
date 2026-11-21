import React, { useState, useRef } from 'react';
import { FolderPlus, Folder, FileText, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { sourceService } from '../../services/source.service';
import { Source } from '../../types/source.types';

interface FolderUploadFormProps {
  projectId: string;
  onSuccess: (source: Source) => void;
  onCancel: () => void;
}

export const FolderUploadForm: React.FC<FolderUploadFormProps> = ({
  projectId,
  onSuccess,
  onCancel,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string>('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | File[]) => {
    setError(null);
    const fileList = Array.from(files);
    if (fileList.length === 0) {
      setError('No files selected in folder.');
      return;
    }

    if (fileList.length > 10000) {
      setError(`Folder contains ${fileList.length} files. Maximum allowed limit is 10,000 files.`);
      return;
    }

    let totalBytes = 0;
    for (const f of fileList) {
      totalBytes += f.size;
    }

    if (totalBytes > 100 * 1024 * 1024) {
      setError(`Total folder size (${(totalBytes / (1024 * 1024)).toFixed(1)}MB) exceeds the 100MB limit.`);
      return;
    }

    // Determine root folder name from webkitRelativePath
    let detectedName = 'source_folder';
    const firstRel = (fileList[0] as any).webkitRelativePath;
    if (firstRel && firstRel.includes('/')) {
      detectedName = firstRel.split('/')[0];
    } else if (fileList[0].name) {
      detectedName = 'local_project';
    }

    setFolderName(detectedName);
    setSelectedFiles(fileList);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const totalSizeFormatted = () => {
    const bytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);
      setProgressStage(`Uploading ${selectedFiles.length} files from folder...`);

      const source = await sourceService.uploadFolderSource(
        projectId,
        selectedFiles,
        folderName || 'source_folder'
      );

      setProgressStage('Folder ingested & verified successfully!');
      onSuccess(source);
    } catch (err: any) {
      console.error('Folder upload failed:', err);
      setError(err.message || 'Folder ingestion failed. Please verify folder permissions and contents.');
    } finally {
      setUploading(false);
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

      {/* Hidden Folder Input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is standard for folder picker in modern browsers
        webkitdirectory=""
        // @ts-ignore
        directory=""
        multiple
        onChange={handleChange}
        className="hidden"
      />

      {/* Drag & Drop / Click Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => folderInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-cyan-400 bg-cyan-500/10'
            : selectedFiles.length > 0
            ? 'border-cyan-500/50 bg-slate-900/60'
            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/30'
        }`}
      >
        {selectedFiles.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3 text-left">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                    <span>{folderName}</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                      {selectedFiles.length} files
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Total payload size: {totalSizeFormatted()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFiles([]);
                  setFolderName('');
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Remove folder selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Structure Preview */}
            <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-left">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Folder Structure Preview</span>
                <span>showing top {Math.min(selectedFiles.length, 6)} files</span>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto font-mono text-[11px] text-slate-300">
                {selectedFiles.slice(0, 6).map((file, idx) => {
                  const rel = (file as any).webkitRelativePath || file.name;
                  return (
                    <div key={idx} className="flex items-center space-x-1.5 text-slate-400 truncate">
                      <FileText className="w-3 h-3 text-cyan-400/70 shrink-0" />
                      <span className="truncate">{rel}</span>
                    </div>
                  );
                })}
                {selectedFiles.length > 6 && (
                  <div className="text-[10px] text-slate-500 italic pt-0.5">
                    + {selectedFiles.length - 6} more files included
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto text-cyan-400">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Select or Drop a Local Folder
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload any normal directory from your filesystem without converting it to a .zip archive.
              </p>
            </div>
            <div className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-cyan-400">
              <span>Supports nested subdirectories & all code files up to 100MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Status */}
      {uploading && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-3">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
          <span className="text-xs text-slate-300 font-mono">{progressStage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800">
        <Button variant="secondary" size="sm" type="button" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="submit"
          isLoading={uploading}
          disabled={selectedFiles.length === 0}
          leftIcon={<FolderPlus className="w-4 h-4" />}
        >
          Upload & Ingest Folder
        </Button>
      </div>
    </form>
  );
};
