'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatTimeRelative } from '@/lib/utils';
import {
  Rocket,
  Plus,
  Filter,
  GitCommit,
  ExternalLink,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function DeploymentsListPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [envFilter, setEnvFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadDeployments = async () => {
    try {
      const res = await api.getDeployments(projectId, {
        environment: envFilter || undefined,
        status: statusFilter || undefined,
      });
      if (res.deployments) {
        setDeployments(res.deployments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadDeployments();
  }, [projectId, envFilter, statusFilter]);

  const handleQuickStatusUpdate = async (depId: string, newStatus: string) => {
    try {
      await api.updateDeploymentStatus(depId, newStatus, `Manual transition to ${newStatus}`);
      loadDeployments();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Rocket className="h-5 w-5 text-cyan-400" />
              <span>Deployment Stream</span>
            </h1>
            <p className="text-xs text-slate-400">
              Track versions, Git commits, rollback actions, and status lifecycles.
            </p>
          </div>

          <Link href={`/projects/${projectId}/deployments/new`}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Record Deployment</span>
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Environments</option>
            <option value="PRODUCTION">PRODUCTION</option>
            <option value="STAGING">STAGING</option>
            <option value="DEVELOPMENT">DEVELOPMENT</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESSFUL">SUCCESSFUL</option>
            <option value="RUNNING">RUNNING</option>
            <option value="FAILED">FAILED</option>
            <option value="ROLLED_BACK">ROLLED_BACK</option>
            <option value="PENDING">PENDING</option>
          </select>

          {(envFilter || statusFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEnvFilter('');
                setStatusFilter('');
              }}
              className="h-7 text-xs text-slate-400 hover:text-slate-200"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Deployments List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center space-y-2">
            <Rocket className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Deployments Found</h3>
            <p className="text-xs text-slate-500">
              No deployments recorded matching the active criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deployments.map((dep) => (
              <div
                key={dep.id}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm font-mono">{dep.version}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {dep.environment}
                      </Badge>
                      <Badge
                        variant={
                          dep.status === 'SUCCESSFUL'
                            ? 'success'
                            : dep.status === 'FAILED'
                            ? 'destructive'
                            : dep.status === 'RUNNING'
                            ? 'running'
                            : dep.status === 'ROLLED_BACK'
                            ? 'rolled_back'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {dep.status}
                      </Badge>
                      <span className="font-mono text-xs text-slate-400">
                        Commit: {dep.commitSha?.substring(0, 7)} ({dep.branch})
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      {dep.releaseNotes || 'Standard deployment rollout.'}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                      <span>Triggered by: {dep.triggeredBy?.name || 'CI/CD Workflow'}</span>
                      <span>•</span>
                      <span>Occurred: {formatDate(dep.occurredAt)}</span>
                      {dep.completedAt && (
                        <>
                          <span>•</span>
                          <span>Completed: {formatTimeRelative(dep.completedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {dep.status === 'RUNNING' && (
                      <Button
                        size="sm"
                        onClick={() => handleQuickStatusUpdate(dep.id, 'SUCCESSFUL')}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Mark Success</span>
                      </Button>
                    )}

                    {dep.status === 'SUCCESSFUL' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickStatusUpdate(dep.id, 'ROLLED_BACK')}
                        className="h-7 text-xs text-purple-300 border-purple-500/30 hover:bg-purple-950/20 gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Rollback</span>
                      </Button>
                    )}

                    <Link href={`/projects/${projectId}/deployments/${dep.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-400 hover:text-indigo-300">
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
