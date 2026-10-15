'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layouts/AppLayout';
import { OperationalMetricsCard } from '@/components/charts/OperationalMetricsCard';
import { DeploymentTrendsChart } from '@/components/charts/DeploymentTrendsChart';
import { SeverityDistributionChart } from '@/components/charts/SeverityDistributionChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatTimeRelative } from '@/lib/utils';
import {
  Rocket,
  AlertOctagon,
  Clock,
  ArrowRight,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
} from 'lucide-react';

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { setActiveProject } = useAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getProjectDashboard(projectId);
        if (res.project) {
          setData(res);
          setActiveProject(res.project);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) load();
  }, [projectId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (!data?.project) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-xs text-slate-500">
          Project not found or access denied.
        </div>
      </AppLayout>
    );
  }

  const { project, summary, severityDistribution, activityTrend, recurringPatterns, recentActivity, recentDeployments, recentIncidents } = data;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">{project.name}</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {project.environment}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">{project.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}/incidents/new`}>
              <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5 bg-red-600/20 border-red-500/30 text-red-300">
                <AlertOctagon className="h-3.5 w-3.5" />
                <span>Report Incident</span>
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/deployments/new`}>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white">
                <Rocket className="h-3.5 w-3.5" />
                <span>Record Deploy</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        {summary && <OperationalMetricsCard summary={summary} />}

        {/* Charts: Deployment Activity vs Incidents & Severity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">
                  Deployment Activity vs. Incidents
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  Operational Activity
                </Badge>
              </div>
              <CardDescription>
                Timeline density showing deployments correlated against reported failure events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeploymentTrendsChart data={activityTrend} />
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">
                Severity Breakdown
              </CardTitle>
              <CardDescription>Active & historic incident counts</CardDescription>
            </CardHeader>
            <CardContent>
              <SeverityDistributionChart distribution={severityDistribution} />
            </CardContent>
          </Card>
        </div>

        {/* Recurring Issues & Forensic Patterns */}
        {recurringPatterns && recurringPatterns.length > 0 && (
          <Card className="border-indigo-500/20 bg-slate-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Identified Recurring Incident Patterns</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  Pattern Heuristics
                </Badge>
              </div>
              <CardDescription>
                Systematic failure signatures identified across repeated deployments and state transitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recurringPatterns.map((rp: any, idx: number) => (
                <div key={idx} className="rounded-md border border-slate-800 bg-slate-950/60 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{rp.pattern}</span>
                    <Badge variant={rp.severity.toLowerCase() as any} className="text-[10px]">
                      {rp.occurrences}x Observed
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    <strong className="text-indigo-400">Recommended Remediation:</strong> {rp.suggestedFix}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Two-Column Lists: Active Incidents & Latest Deployments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Incidents */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 text-red-400" />
                  <span>Recent Production Incidents</span>
                </CardTitle>
              </div>
              <Link href={`/projects/${projectId}/incidents`} className="text-xs text-indigo-400 hover:underline">
                View all &rarr;
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentIncidents?.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No incidents recorded.</div>
              ) : (
                recentIncidents?.map((inc: any) => (
                  <Link
                    key={inc.id}
                    href={`/projects/${projectId}/incidents/${inc.id}`}
                    className="block rounded border border-slate-800/80 bg-slate-950/50 p-2.5 hover:border-slate-700 hover:bg-slate-950/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 truncate max-w-[260px]">
                        {inc.title}
                      </span>
                      <Badge variant={inc.severity.toLowerCase() as any} className="text-[10px]">
                        {inc.severity}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Status: <span className="font-mono text-slate-300">{inc.status}</span></span>
                      <span className="font-mono">{formatTimeRelative(inc.occurredAt)}</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Deployments */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-cyan-400" />
                  <span>Recent Deployments</span>
                </CardTitle>
              </div>
              <Link href={`/projects/${projectId}/deployments`} className="text-xs text-indigo-400 hover:underline">
                View all &rarr;
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDeployments?.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No deployments recorded.</div>
              ) : (
                recentDeployments?.map((dep: any) => (
                  <Link
                    key={dep.id}
                    href={`/projects/${projectId}/deployments/${dep.id}`}
                    className="block rounded border border-slate-800/80 bg-slate-950/50 p-2.5 hover:border-slate-700 hover:bg-slate-950/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 font-mono">
                        {dep.version} ({dep.commitSha?.substring(0, 7)})
                      </span>
                      <Badge
                        variant={
                          dep.status === 'SUCCESSFUL'
                            ? 'success'
                            : dep.status === 'FAILED'
                            ? 'destructive'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {dep.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Branch: <span className="font-mono text-slate-300">{dep.branch}</span></span>
                      <span className="font-mono">{formatTimeRelative(dep.completedAt || dep.occurredAt)}</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
