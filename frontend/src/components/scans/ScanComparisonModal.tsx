import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Scan, ScanResult } from '../../types/scan.types';
import { scanService } from '../../services/scan.service';
import { GitCompare, ArrowRight, CheckCircle2, AlertCircle, Plus, Minus } from 'lucide-react';

interface ScanComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  scans: Scan[];
}

export const ScanComparisonModal: React.FC<ScanComparisonModalProps> = ({
  isOpen,
  onClose,
  scans,
}) => {
  const [baseScanId, setBaseScanId] = useState<string>(scans.length > 1 ? scans[1].id : scans[0]?.id || '');
  const [targetScanId, setTargetScanId] = useState<string>(scans[0]?.id || '');

  const [baseResults, setBaseResults] = useState<ScanResult[]>([]);
  const [targetResults, setTargetResults] = useState<ScanResult[]>([]);
  const [compared, setCompared] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleCompare = async () => {
    if (!baseScanId || !targetScanId) return;
    try {
      setLoading(true);
      const [bRes, tRes] = await Promise.all([
        scanService.getScanResults(baseScanId),
        scanService.getScanResults(targetScanId),
      ]);
      setBaseResults(bRes);
      setTargetResults(tRes);
      setCompared(true);
    } catch (err) {
      console.error('Failed to load scan comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  const baseFingerprints = new Set(baseResults.map((r) => r.rule_id + ':' + (r.file || '')));
  const targetFingerprints = new Set(targetResults.map((r) => r.rule_id + ':' + (r.file || '')));

  const newFindings = targetResults.filter((r) => !baseFingerprints.has(r.rule_id + ':' + (r.file || '')));
  const resolvedFindings = baseResults.filter((r) => !targetFingerprints.has(r.rule_id + ':' + (r.file || '')));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare Security Scan Executions">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Base Previous Scan:
            </label>
            <select
              value={baseScanId}
              onChange={(e) => setBaseScanId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  Scan #{s.id.substring(0, 8)} ({s.status}) - {s.findings_count} findings
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Latest Scan:
            </label>
            <select
              value={targetScanId}
              onChange={(e) => setTargetScanId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  Scan #{s.id.substring(0, 8)} ({s.status}) - {s.findings_count} findings
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={handleCompare}
            isLoading={loading}
            leftIcon={<GitCompare className="w-4 h-4" />}
          >
            Compare Scans
          </Button>
        </div>

        {compared && (
          <div className="space-y-4 pt-3 border-t border-slate-800">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
                <span className="text-[11px] text-rose-400 font-semibold uppercase flex items-center space-x-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Findings ({newFindings.length})</span>
                </span>
                <p className="text-xs text-slate-300">New vulnerabilities introduced since base scan.</p>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1">
                <span className="text-[11px] text-emerald-400 font-semibold uppercase flex items-center space-x-1">
                  <Minus className="w-3.5 h-3.5" />
                  <span>Resolved Findings ({resolvedFindings.length})</span>
                </span>
                <p className="text-xs text-slate-300">Vulnerabilities fixed since base scan.</p>
              </div>
            </div>

            {newFindings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-rose-400">Newly Introduced Vulnerabilities:</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {newFindings.map((nf) => (
                    <div key={nf.id} className="p-2 bg-slate-950 border border-slate-800 rounded text-xs">
                      <span className="font-bold text-slate-100">{nf.title}</span>
                      <span className="text-[10px] font-mono text-slate-400 block">{nf.file}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
