import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ZentronyxLogo } from '../components/common/ZentronyxLogo';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-[#03060b] relative overflow-hidden">
      {/* Ambient Cyber Grid Highlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-3">
            <ZentronyxLogo size="lg" showText={false} animated={true} />
          </Link>
          <h1 className="text-2xl font-bold tracking-widest text-slate-100 font-mono">
            ZENTRONYX
          </h1>
          <p className="text-xs text-cyan-400 font-mono mt-1 uppercase tracking-widest font-semibold">
            SECURITY PLATFORM
          </p>
        </div>

        <Outlet />

        <div className="text-center mt-8 text-xs text-slate-500 font-mono">
          Zentronyx Platform Core v1.0.0 &bull; Secure Authentication Engine
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
