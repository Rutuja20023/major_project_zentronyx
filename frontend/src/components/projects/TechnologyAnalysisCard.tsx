import React from 'react';
import {
  Code,
  Box,
  Layers,
  FileCode,
  Terminal,
  Cpu,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { ProjectAnalysis } from '../../types/analysis.types';

interface TechnologyAnalysisCardProps {
  analysis: ProjectAnalysis;
}

export const TechnologyAnalysisCard: React.FC<TechnologyAnalysisCardProps> = ({ analysis }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Technology & Architecture Analysis</span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {analysis.status}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Read-only inspection of source structure, frameworks, and binary targets.
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-slate-400">
          <span>Confidence Score: </span>
          <span className="text-cyan-400 font-bold">{(analysis.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Primary Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Primary Language */}
        <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span>Primary Language</span>
          </span>
          <p className="text-base font-bold text-slate-100 font-mono">
            {analysis.primary_language || 'Unknown'}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {analysis.detected_languages?.map((lang) => (
              <span key={lang} className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Framework */}
        <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Framework</span>
          </span>
          <p className="text-base font-bold text-slate-100 font-mono">
            {analysis.framework || 'None Detected'}
          </p>

        </div>

        {/* Build System */}
        <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>Build System</span>
          </span>
          <p className="text-base font-bold text-slate-100 font-mono">
            {analysis.build_system || 'Custom/None'}
          </p>
        </div>

        {/* Application Type */}
        <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Application Type</span>
          </span>
          <p className="text-base font-bold text-slate-100 font-mono">
            {analysis.application_type || 'GENERAL'}
          </p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded inline-block font-mono ${
            analysis.binary_capable ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            {analysis.binary_capable ? `Binary: ${analysis.binary_type}` : 'Non-Binary Codebase'}
          </span>
        </div>
      </div>

      {/* Detailed Details & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
        {/* Source Statistics */}
        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Source Code Statistics</span>
          </h4>

          {analysis.statistics ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Files</span>
                <span className="font-mono font-bold text-slate-200 text-sm">{analysis.statistics.total_files}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Code Lines</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{analysis.statistics.code_lines}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Test Files</span>
                <span className="font-mono font-bold text-cyan-400 text-sm">{analysis.statistics.test_files_count}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Comments</span>
                <span className="font-mono font-bold text-slate-400 text-sm">{analysis.statistics.comment_lines}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No detailed file statistics available.</p>
          )}
        </div>

        {/* Manifests & Entry Points */}
        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>Dependency Manifests & Entry Points</span>
          </h4>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Manifests Detected:</span>
              {analysis.dependency_manifests && analysis.dependency_manifests.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.dependency_manifests.map((m) => (
                    <span key={m} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-slate-200">
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 italic text-[11px]">None detected</span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Entry Points:</span>
              {analysis.entry_points && analysis.entry_points.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.entry_points.map((ep) => (
                    <span key={ep} className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded font-mono text-[11px] text-cyan-300">
                      {ep}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 italic text-[11px]">None detected</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Warnings */}
      {analysis.warnings && analysis.warnings.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
          <p className="font-semibold flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Analysis Warnings ({analysis.warnings.length}):</span>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1 font-mono text-[11px]">
            {analysis.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
