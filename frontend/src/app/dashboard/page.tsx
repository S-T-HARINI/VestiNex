'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layouts/AppLayout';
import { OperationalMetricsCard } from '@/components/charts/OperationalMetricsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const DeploymentTrendsChart = dynamic(
  () => import('@/components/charts/DeploymentTrendsChart').then((m) => m.DeploymentTrendsChart),
  { ssr: false }
);
const SeverityDistributionChart = dynamic(
  () => import('@/components/charts/SeverityDistributionChart').then((m) => m.SeverityDistributionChart),
  { ssr: false }
);
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Layers,
  ArrowRight,
  Plus,
  Rocket,
  AlertOctagon,
  Activity,
  GitCommit,
  ShieldCheck,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, projects, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.getGlobalOverview();
        if (res.stats) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isInitialLoading = authLoading || loading;

  // Aggregated trend data and severity breakdown from backend
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Engineering Observability Dashboard
            </h1>
            <p className="text-xs text-slate-400">
              Welcome back, <span className="text-slate-200 font-semibold">{user?.name}</span>. Real-time incident intelligence across all monitored scopes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/projects/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5 shadow-sm shadow-indigo-900/30">
                <Plus className="h-3.5 w-3.5" />
                <span>New Project</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isInitialLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-lg bg-slate-900/60" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="lg:col-span-2 h-72 rounded-lg bg-slate-900/60" />
              <Skeleton className="h-72 rounded-lg bg-slate-900/60" />
            </div>
          </div>
        ) : projects.length === 0 ? (
          /* Welcoming Empty Workspace Onboarding State */
          <div className="space-y-8 py-2">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-950 p-8">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-[11px] font-mono text-indigo-300">
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <span>VESTINEX OBSERVABILITY PLATFORM</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Welcome to Your Clean Engineering Workspace
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-indigo-300 font-medium italic">"Every failure leaves a trace."</span> VestiNex connects your production deployments, code commits, and runtime incident telemetry into unified chronological forensic timelines — giving your team immediate clarity when outages strike.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/projects/new">
                    <Button size="default" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 px-5 font-medium shadow-md shadow-indigo-900/40">
                      <Plus className="h-4 w-4" />
                      <span>Create Your First Project</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* 3-Step Guided Workflow */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                How VestiNex Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card className="border-slate-800 bg-slate-900/50 hover:border-slate-700/80 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-1 text-indigo-400">
                      <Layers className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-white">
                      1. Define Monitored Scope
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-400 space-y-2">
                    <p>
                      Group your software services by environment — Production, Staging, or Canary. Connect your Git repository and assign team roles.
                    </p>
                    <div className="pt-2 text-[11px] text-slate-500 font-mono">
                      e.g., API Gateway, Payment Worker, Web App
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/50 hover:border-slate-700/80 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-1 text-cyan-400">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-white">
                      2. Record Deployments & Commits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-400 space-y-2">
                    <p>
                      Log CI/CD release events with commit SHAs, author metadata, and release notes via REST webhooks or our manual audit interface.
                    </p>
                    <div className="pt-2 text-[11px] text-slate-500 font-mono">
                      Tracks versions, rollbacks, and diffs
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/50 hover:border-slate-700/80 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-1 text-rose-400">
                      <AlertOctagon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-white">
                      3. Correlate Incident Timelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-400 space-y-2">
                    <p>
                      When alerts fire, link incidents to recent deployments. Reconstruct chronological timelines to isolate offending commits with confidence scores.
                    </p>
                    <div className="pt-2 text-[11px] text-slate-500 font-mono">
                      Automatic temporal correlation & MTTR tracking
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Starters Section */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Ready to start monitoring?</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Create a project for your team's application to view real-time deployment metrics and incident heuristics.
                </p>
              </div>
              <Link href="/projects/new">
                <Button size="sm" variant="outline" className="text-xs border-slate-700 hover:bg-slate-800 gap-1.5 shrink-0">
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Populated Monitored Workspace */
          <>
            {/* Operational Metrics Cards */}
            {stats && <OperationalMetricsCard summary={stats} />}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white">
                      Deployment Activity vs. Incidents
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      Past 7 Days
                    </Badge>
                  </div>
                  <CardDescription>
                    Correlating deployment volume against incident reporting frequency.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DeploymentTrendsChart data={trendData} />
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-white">
                    Incident Severity Distribution
                  </CardTitle>
                  <CardDescription>Breakdown by impact priority</CardDescription>
                </CardHeader>
                <CardContent>
                  <SeverityDistributionChart distribution={severityData} />
                </CardContent>
              </Card>
            </div>

            {/* Active Monitored Projects Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span>Monitored Software Projects ({projects.length})</span>
                </h2>
                <Link href="/projects" className="text-xs text-indigo-400 hover:underline">
                  View All Projects &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="group block">
                    <Card className="h-full border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80 transition-all">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 group-hover:text-white text-xs truncate max-w-[200px]">
                            {p.name}
                          </span>
                          <Badge
                            variant={
                              p.environment === 'PRODUCTION'
                                ? 'destructive'
                                : p.environment === 'STAGING'
                                ? 'medium'
                                : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {p.environment}
                          </Badge>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {p.description || 'No description provided.'}
                        </p>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Rocket className="h-3 w-3 text-cyan-400" />
                            <span>{p.deploymentCount || 0} deploys</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <AlertOctagon className="h-3 w-3 text-red-400" />
                            <span>{p.incidentCount || 0} open incidents</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
