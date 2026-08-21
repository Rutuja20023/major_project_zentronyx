import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useHealth } from '../hooks/useHealth';
import { projectService } from '../services/project.service';
import { Project } from '../types/project.types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  ShieldCheck,
  FolderGit2,
  Activity,
  AlertTriangle,
  Plus,
  ExternalLink,
  Cpu,
  Database,
  ArrowRight,
  BookOpen,
  Sparkles
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { health, loading: healthLoading } = useHealth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await projectService.getProjects();
        setProjects(data);
      } catch (e) {
        console.error('Failed to load projects for dashboard', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || healthLoading) {
    return <LoadingSpinner label="Loading Zentronyx dashboard..." />;
  }

  const avgRisk = projects.length > 0
    ? (projects.reduce((sum, p) => sum + (p.risk_score || 0), 0) / projects.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-dark-900 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>SECURITY COMMAND CONSOLE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            Welcome back, {user?.full_name || user?.username}!
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            DevSecOps automated vulnerability scanning & GNN malware engine control plane.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/how-it-works')}
            leftIcon={<BookOpen className="w-4 h-4" />}
          >
            How It Works
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/docs', '_blank')}
            leftIcon={<ExternalLink className="w-4 h-4" />}
          >
            Swagger API
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/projects')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Project
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card glow="cyan">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono uppercase">Monitored Projects</span>
            <FolderGit2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-3 font-mono">
            {projects.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Active security repositories</p>
        </Card>

        <Card glow="emerald">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono uppercase">Platform Risk Status</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-3 font-mono">
            {avgRisk} <span className="text-xs text-slate-400 font-normal">/ 10.0</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Aggregated risk metric</p>
        </Card>

        <Card glow="amber">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono uppercase">Engine Status</span>
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <Badge variant={health?.status === 'healthy' ? 'healthy' : 'degraded'}>
              {health?.status?.toUpperCase() || 'HEALTHY'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            Backend v{health?.version || '1.0.0'}
          </p>
        </Card>

        <Card glow="rose">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 font-mono uppercase">Scan Pipelines</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-3 font-mono">
            READY
          </div>
          <p className="text-xs text-slate-500 mt-1">Orchestrator ready for ingestion</p>
        </Card>
      </div>

      {/* System Infrastructure Monitor & Quick Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Breakdown Widget */}
        <Card title="Infrastructure Health" subtitle="Live microservices latency & connection telemetry" className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">PostgreSQL Database</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Latency: {health?.services?.database?.latency_ms ?? 0} ms
                  </div>
                </div>
              </div>
              <Badge variant={health?.services?.database?.status === 'healthy' ? 'healthy' : 'unhealthy'}>
                {health?.services?.database?.status || 'OK'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-3">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">AI Microservice</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    GNN Inference Engine
                  </div>
                </div>
              </div>
              <Badge variant={health?.services?.ai_service?.status === 'healthy' ? 'healthy' : 'degraded'}>
                {health?.services?.ai_service?.status || 'STANDBY'}
              </Badge>
            </div>

            {/* Quick Link Card for How It Works */}
            <div
              onClick={() => navigate('/how-it-works')}
              className="p-3.5 bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border border-cyan-500/20 rounded-xl hover:border-cyan-500/40 transition-all cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-cyan-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Platform Guide</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                Understand the 8-stage scan pipeline, SAST, SCA, DAST, and GNN AI models.
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Security Projects */}
        <Card
          title="Active Projects"
          subtitle="Registered repositories & security scan targets"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View All
            </Button>
          }
          className="lg:col-span-2"
        >
          {projects.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No security projects registered yet. Click "New Project" to register your first repository.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/80 rounded-lg transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{p.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-xs">{p.description || 'No description provided.'}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge riskLevel={p.risk_level} />
                    <span className="text-xs text-slate-500 font-mono">{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
