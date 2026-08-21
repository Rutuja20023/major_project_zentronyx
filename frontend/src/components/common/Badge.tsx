import React from 'react';
import { RiskLevel } from '../../types/project.types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'low' | 'medium' | 'high' | 'critical' | 'unknown' | 'healthy' | 'degraded' | 'unhealthy' | 'info';
  riskLevel?: RiskLevel;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  riskLevel,
  size = 'md',
}) => {
  let activeVariant = variant;
  if (riskLevel) {
    switch (riskLevel) {
      case RiskLevel.LOW: activeVariant = 'low'; break;
      case RiskLevel.MEDIUM: activeVariant = 'medium'; break;
      case RiskLevel.HIGH: activeVariant = 'high'; break;
      case RiskLevel.CRITICAL: activeVariant = 'critical'; break;
      default: activeVariant = 'unknown'; break;
    }
  }

  const styles = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    unknown: 'bg-slate-800 text-slate-400 border-slate-700',
    healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    unhealthy: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  const displayText = children || riskLevel || activeVariant?.toUpperCase();

  return (
    <span className={`inline-flex items-center rounded-full border ${styles[activeVariant || 'info']} ${sizes[size]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {displayText}
    </span>
  );
};
