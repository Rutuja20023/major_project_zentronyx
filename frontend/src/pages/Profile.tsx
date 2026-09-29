import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { User, Mail, Shield, Key, LogOut, Calendar } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

export const Profile: React.FC = () => {
  const { user, token, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <User className="w-5 h-5 text-cyan-400" />
          <span>User Security Profile</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Account information, active role permissions, and authentication session details.
        </p>
      </div>

      <Card title="Account Overview" subtitle="User credentials and RBAC assignment">
        <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 text-2xl font-bold">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">{user?.full_name || user?.username}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="info">{user?.role}</Badge>
              <span className="text-xs text-slate-500 font-mono">ID: {user?.id}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center space-x-3">
            <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="truncate">
              <div className="text-[11px] font-mono text-slate-500 uppercase">Email Address</div>
              <div className="text-sm font-semibold text-slate-200 truncate">{user?.email}</div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center space-x-3">
            <User className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase">Username</div>
              <div className="text-sm font-semibold text-slate-200">{user?.username}</div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center space-x-3">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase">Account Status</div>
              <div className="text-sm font-semibold text-emerald-400">ACTIVE</div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase">Member Since</div>
              <div className="text-sm font-semibold text-slate-200">
                {formatDate(user?.created_at)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Active JWT Session Token" subtitle="Bearer token used for API requests">
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono truncate max-w-xl">
            <Key className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{token || 'No active token'}</span>
          </div>
          <Button variant="danger" size="sm" onClick={() => logout()} leftIcon={<LogOut className="w-3.5 h-3.5" />}>
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
};
