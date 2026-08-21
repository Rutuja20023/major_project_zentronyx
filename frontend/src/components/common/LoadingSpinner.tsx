import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading Zentronyx platform...',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <ShieldCheck className="w-6 h-6 text-cyan-400 absolute" />
      </div>
      <p className="text-sm font-medium text-slate-400 animate-pulse">{label}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
};
