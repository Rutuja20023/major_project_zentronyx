import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  glow?: 'cyan' | 'emerald' | 'rose' | 'amber' | 'none';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  glow = 'none',
  onClick,
}) => {
  const glowClasses = {
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50 shadow-cyan-500/10',
    emerald: 'border-emerald-500/30 hover:border-emerald-500/50 shadow-emerald-500/10',
    rose: 'border-rose-500/30 hover:border-rose-500/50 shadow-rose-500/10',
    amber: 'border-amber-500/30 hover:border-amber-500/50 shadow-amber-500/10',
    none: 'border-slate-800 hover:border-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/80 backdrop-blur-md border rounded-xl p-5 shadow-xl transition-all duration-300 ${glowClasses[glow]} ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
