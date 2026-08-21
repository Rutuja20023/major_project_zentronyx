import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useHealth } from '../../hooks/useHealth';
import { Badge } from '../common/Badge';
import { ZentronyxLogo } from '../common/ZentronyxLogo';
import { Bell, LogOut, Activity, BookOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { health } = useHealth(45000);
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-6">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => navigate('/dashboard')}
          title="Return to Security Dashboard"
        >
          <ZentronyxLogo size="sm" showText={true} />
        </div>

        <Link
          to="/how-it-works"
          className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-950/50 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300 hover:text-white transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>How Zentronyx Works</span>
        </Link>
      </div>

      <div className="flex items-center space-x-5">
        {/* System Health Badge */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">System Status:</span>
          <Badge variant={health?.status === 'healthy' ? 'healthy' : 'degraded'}>
            {health?.status || 'MONITORING'}
          </Badge>
        </div>

        {/* Notification Bell */}
        <button className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Dropdown */}
        <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center space-x-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-sm font-semibold">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200">{user?.username}</div>
              <div className="text-[10px] text-cyan-400 font-mono font-medium">{user?.role}</div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Log out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
