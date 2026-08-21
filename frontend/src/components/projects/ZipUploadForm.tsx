import React, { useState, useRef } from 'react';
import { UploadCloud, FileArchive, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '../common/Button';
import { sourceService } from '../../services/source.service';
import { Source } from '../../types/source.types';

interface ZipUploadFormProps {
  projectId: string;
  onSuccess: (source: Source) => void;
  onCancel: () => void;
}

export const ZipUploadForm: React.FC<ZipUploadFormProps> = ({
  projectId,
  onSuccess,
  onCancel,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Only .zip compressed archives are accepted.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 100 * 1024 * 1024) { // 100MB
      setError('File size exceeds the 100MB upload limit.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      setProgressStage('Uploading archive & verifying header magic bytes...');

      const source = await sourceService.uploadZipSource(projectId, selectedFile);
      setProgressStage('Extraction complete!');
      onSuccess(source);
    } catch (err: any) {
      console.error('ZIP upload failed:', err);
      setError(err.message || 'ZIP upload and extraction failed.');
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

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-cyan-400 bg-cyan-500/10'
            : selectedFile
            ? 'border-cyan-500/50 bg-slate-900/60'
            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center justify-between p-2 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-3 text-left">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <FileArchive className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2 py-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">
                Drag & drop your source <span className="text-cyan-400">ZIP archive</span> here
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports .zip archives up to 100MB (Zip Slip & symlink protected)
              </p>
            </div>
          </div>
        )}
      </div>

      {uploading && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center space-x-2 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
          <span>{progressStage}</span>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
        <Button variant="secondary" size="sm" type="button" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" isLoading={uploading} disabled={!selectedFile}>
          Upload & Ingest ZIP
        </Button>
      </div>
    </form>
  );
};
