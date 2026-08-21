import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ShieldOff, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 text-center">
      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-full mb-4 text-rose-400">
        <ShieldOff className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-bold font-mono text-slate-100 mb-2">404</h1>
      <h2 className="text-lg font-semibold text-slate-300 mb-2">Security Route Not Found</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        The requested resource path does not exist or has been relocated.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/dashboard')}
        leftIcon={<Home className="w-4 h-4" />}
      >
        Return to Dashboard
      </Button>
    </div>
  );
};
