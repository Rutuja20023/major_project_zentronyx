import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  ShieldAlert,
  Bug,
  Binary,
  FileCheck,
  User,
  BookOpen,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderGit2 },
    { label: 'Security Scans', path: '/scans', icon: ShieldAlert },
    { label: 'Vulnerabilities', path: '/vulnerabilities', icon: Bug },
    { label: 'GNN Malware Detector', path: '/gnn-detector', icon: Binary },
    { label: 'Compliance Reports', path: '/reports', icon: FileCheck },
    { label: 'How It Works', path: '/how-it-works', icon: BookOpen },
    { label: 'User Profile', path: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
          Security Console
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 font-semibold border-l-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
        <div className="flex justify-between font-mono">
          <span>Platform Status</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>
        <div className="text-[11px] text-slate-500">v1.0.0 DevSecOps Core</div>
      </div>
    </aside>
  );
};

export default Sidebar;
