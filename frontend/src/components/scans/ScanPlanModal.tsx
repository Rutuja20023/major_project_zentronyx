import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ModuleType, Scan } from '../../types/scan.types';
import { ProjectAnalysis } from '../../types/analysis.types';
import { scanService } from '../../services/scan.service';
import { ShieldCheck, ShieldAlert, AlertCircle, Play, Info, Layers } from 'lucide-react';
import { ScanExecutionFlow } from './ScanExecutionFlow';

interface ScanPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  analysis: ProjectAnalysis | null;
  onScanCreated: (scan: Scan) => void;
  onViewFindings?: (scan: Scan) => void;
  onDownloadPdf?: (scanId: string) => void;
  initialScan?: Scan | null;
}

interface ModuleApplicability {
  type: ModuleType;
  name: string;
  description: string;
  applicable: boolean;
  skipReason?: string;
}

export const ScanPlanModal: React.FC<ScanPlanModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  analysis,
  onScanCreated,
  onViewFindings,
  onDownloadPdf,
  initialScan = null,
}) => {
  const [selectedModules, setSelectedModules] = useState<ModuleType[]>([
    ModuleType.SAST,
    ModuleType.SCA,
    ModuleType.DAST,
    ModuleType.BINARY_ANALYSIS,
    ModuleType.GNN,
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScan, setActiveScan] = useState<Scan | null>(initialScan);

  useEffect(() => {
    if (isOpen) {
      setActiveScan(initialScan || null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialScan]);

  // Compute applicability based on analysis
  const primaryLang = analysis?.primary_language || 'Unknown';
  const hasManifests = (analysis?.dependency_manifests?.length || 0) > 0;
  const hasFramework = (analysis?.framework || 'None') !== 'None';
  const binaryCapable = analysis?.binary_capable || false;

  const modulesList: ModuleApplicability[] = [
    {
      type: ModuleType.SAST,
      name: 'Static Application Security Testing (SAST)',
      description: 'Scans source code for hardcoded secrets, SQL injection, and taint patterns.',
      applicable: primaryLang !== 'Unknown',
      skipReason: primaryLang === 'Unknown' ? 'No supported source code files detected.' : undefined,
    },
    {
      type: ModuleType.SCA,
      name: 'Software Composition Analysis (SCA)',
      description: 'Checks third-party manifests for known CVE vulnerability advisories.',
      applicable: hasManifests,
      skipReason: !hasManifests ? 'No dependency manifest files (requirements.txt, pom.xml, etc.) found.' : undefined,
    },
    {
      type: ModuleType.DAST,
      name: 'Dynamic Application Security Testing (DAST)',
      description: 'Inspects web app endpoints for missing security headers & clickjacking.',
      applicable: hasFramework,
      skipReason: !hasFramework ? 'No web framework (FastAPI, Django, Spring, etc.) detected.' : undefined,
    },
    {
      type: ModuleType.BINARY_ANALYSIS,
      name: 'Binary & Executable Hardening Analysis',
      description: 'Verifies binary compilation mitigations (Stack Canary, NX, PIE, ASLR).',
      applicable: binaryCapable,
      skipReason: !binaryCapable ? 'Script-only codebase without binary compilation capability.' : undefined,
    },
    {
      type: ModuleType.GNN,
      name: 'Graph Neural Network (GNN) Vulnerability AI',
      description: 'Uses Code Property Graph (CPG) deep learning models for anomaly detection.',
      applicable: primaryLang !== 'Unknown',
      skipReason: primaryLang === 'Unknown' ? 'Insufficient graph structural AST representations.' : undefined,
    },
  ];

  const toggleModule = (modType: ModuleType) => {
    setSelectedModules((prev) =>
      prev.includes(modType) ? prev.filter((m) => m !== modType) : [...prev, modType]
    );
  };

  const handleStartScan = async () => {
    try {
      setLoading(true);
      setError(null);
      const newScan = await scanService.createScan(projectId, {
        requested_modules: selectedModules,
      });
      setActiveScan(newScan);
      onScanCreated(newScan);
    } catch (err: any) {
      console.error('Failed to create scan:', err);
      setError(err.message || 'Failed to initialize security scan execution.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setActiveScan(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={
        activeScan
          ? `Security Scan Pipeline Execution ${projectName ? `— ${projectName}` : ''}`
          : 'Configure Security Scan Execution'
      }
      maxWidth={activeScan ? 'max-w-4xl' : 'max-w-2xl'}
    >
      {activeScan ? (
        <ScanExecutionFlow
          scan={activeScan}
          projectId={projectId}
          projectName={projectName}
          onClose={handleModalClose}
          onViewFindings={(s) => {
            handleModalClose();
            onViewFindings?.(s);
          }}
          onDownloadPdf={onDownloadPdf}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            The Scan Orchestrator evaluates project analysis to select applicable security modules.
            Click <strong className="text-cyan-400">Start Security Scan</strong> to launch the animated
            multi-scanner pipeline flow.
          </p>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Modules List */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {modulesList.map((m) => {
              const isSelected = selectedModules.includes(m.type);
              return (
                <div
                  key={m.type}
                  onClick={() => toggleModule(m.type)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                      />
                      <div>
                        <h4 className="text-xs font-semibold text-slate-100 flex items-center space-x-2">
                          <span>{m.name}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {m.type}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                      </div>
                    </div>

                    <div>
                      {m.applicable ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Applicable</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Will Skip</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {!m.applicable && m.skipReason && (
                    <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 font-mono flex items-center space-x-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>Planner Skip Reason: {m.skipReason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={handleModalClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartScan}
              isLoading={loading}
              disabled={selectedModules.length === 0}
              leftIcon={<Play className="w-4 h-4 fill-slate-950" />}
            >
              Start Security Scan
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
