'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layouts/AppLayout';
import { OperationalMetricsCard } from '@/components/charts/OperationalMetricsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import {
  Layers,
  ArrowRight,
  Plus,
  Rocket,
  AlertOctagon,
  Activity,
  FolderGit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

const DeploymentTrendsChart = dynamic(
  () => import('@/components/charts/DeploymentTrendsChart').then((m) => m.DeploymentTrendsChart),
  { ssr: false }
);
const SeverityDistributionChart = dynamic(
  () => import('@/components/charts/SeverityDistributionChart').then((m) => m.SeverityDistributionChart),
  { ssr: false }
);

export default function DashboardPage() {
  const { user, projects, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    async function loadData() {
      try {
        const res = await api.getGlobalOverview();
        if (res.stats) {
          setStats(res.stats);
        } else {
          setStats(null);
        }
      } catch (err) {
        console.error(err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  const isInitialLoading = authLoading || loading;

  const trendData = stats?.trendData && stats.trendData.length > 0 ? stats.trendData : [];
  const severityData = stats?.severityDistribution || {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Engineering Observability Dashboard
            </h1>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Welcome back, <span className="text-foreground font-medium">{user?.name}</span>. Real-time incident intelligence across all monitored scopes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/projects/new">
              <Button size="sm" className="gap-1.5 text-xs font-medium">
                <Plus className="h-3.5 w-3.5" />
                <span>New Project</span>
              </Button>
            </Link>
          </div>
        </div>

        {isInitialLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        ) : projects.length === 0 ? (
          /* Empty Workspace Onboarding State */
          <div className="rounded-lg border border-border bg-card p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto my-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-surface text-primary mx-auto border border-border">
              <Activity className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-foreground">
                Welcome to Your Clean Engineering Workspace
              </h2>
              <p className="text-xs text-foreground-secondary font-mono">
                Every failure leaves a trace.
              </p>
              <p className="text-xs text-foreground-muted max-w-md mx-auto pt-1">
                You have no active projects configured yet. Initialize your first service or repository to start correlating deployments with production incidents.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/projects/new">
                <Button size="default" className="text-xs font-medium gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Your First Project</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Populated Dashboard Content */
          <>
            {/* Operational Summary Metrics Cards */}
            <OperationalMetricsCard
              summary={
                stats?.summary || {
                  totalDeployments: 0,
                  successfulDeployments: 0,
                  failedDeployments: 0,
                  deploymentSuccessRate: 0,
                  totalIncidents: 0,
                  openIncidents: 0,
                  criticalIncidents: 0,
                  mttrMinutes: 0,
                }
              }
            />

            {/* Monitored Software Projects Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono">
                  Monitored Software Projects ({projects.length})
                </h2>
                <Link
                  href="/projects"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                    <Card className="border border-border bg-card hover:border-foreground-muted transition-colors h-full">
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {p.name}
                          </h3>
                          <Badge
                            variant={
                              p.environment === 'PRODUCTION'
                                ? 'critical'
                                : p.environment === 'STAGING'
                                ? 'high'
                                : 'outline'
                            }
                            className="text-[9px] uppercase font-mono px-1.5 py-0"
                          >
                            {p.environment}
                          </Badge>
                        </div>

                        {p.description && (
                          <p className="text-[11px] text-foreground-secondary line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-foreground-muted pt-2 border-t border-border font-mono">
                          <span>{p.incidentCount || 0} incidents</span>
                          <span>{p.deploymentCount || 0} deploys</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* Visual Telemetry Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono">
                    Deployment & Failure Correlation
                  </CardTitle>
                  <CardDescription className="text-xs text-foreground-secondary">
                    Weekly temporal distribution of deployments vs incident alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <DeploymentTrendsChart data={trendData} />
                </CardContent>
              </Card>

              <Card className="border border-border bg-card">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono">
                    Incident Severity Distribution
                  </CardTitle>
                  <CardDescription className="text-xs text-foreground-secondary">
                    Active breakdown across Critical, High, Medium, and Low tiers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <SeverityDistributionChart distribution={severityData} />
                </CardContent>
              </Card>
            </div>

            {/* Recent Operational Activity Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Incidents Table */}
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono">
                      Recent Incidents
                    </CardTitle>
                    <CardDescription className="text-xs text-foreground-secondary">
                      Active and recently investigated failure events.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {!stats?.recentIncidents || stats.recentIncidents.length === 0 ? (
                    <div className="text-xs text-foreground-muted py-6 text-center border border-dashed border-border rounded-md">
                      No incidents logged across monitored services.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {stats.recentIncidents.slice(0, 5).map((inc: any) => (
                        <div key={inc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/projects/${inc.projectId}/incidents/${inc.id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors truncate block"
                            >
                              {inc.title}
                            </Link>
                            <div className="flex items-center gap-2 text-[10px] text-foreground-muted mt-0.5 font-mono">
                              <span>{formatDate(inc.occurredAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant={
                                inc.severity === 'CRITICAL'
                                  ? 'critical'
                                  : inc.severity === 'HIGH'
                                  ? 'high'
                                  : 'outline'
                              }
                              className="text-[9px] uppercase font-mono px-1.5 py-0"
                            >
                              {inc.severity}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] uppercase font-mono px-1.5 py-0">
                              {inc.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Deployments Table */}
              <Card className="border border-border bg-card">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono">
                      Recent Deployments
                    </CardTitle>
                    <CardDescription className="text-xs text-foreground-secondary">
                      Correlated releases across delivery pipelines.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {!stats?.recentDeployments || stats.recentDeployments.length === 0 ? (
                    <div className="text-xs text-foreground-muted py-6 text-center border border-dashed border-border rounded-md">
                      No deployments recorded across monitored services.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {stats.recentDeployments.slice(0, 5).map((dep: any) => (
                        <div key={dep.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/projects/${dep.projectId}/deployments/${dep.id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                              <span className="font-mono">{dep.version}</span>
                              <span className="text-[10px] text-foreground-muted font-mono">
                                ({dep.commitSha?.substring(0, 7)})
                              </span>
                            </Link>
                            <div className="text-[10px] text-foreground-muted mt-0.5 font-mono">
                              {formatDate(dep.occurredAt)} • {dep.branch || 'main'}
                            </div>
                          </div>
                          <Badge
                            variant={
                              dep.status === 'SUCCESSFUL'
                                ? 'success'
                                : dep.status === 'FAILED'
                                ? 'critical'
                                : 'outline'
                            }
                            className="text-[9px] uppercase font-mono px-1.5 py-0 shrink-0"
                          >
                            {dep.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
