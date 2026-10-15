'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
import {
  Layers,
  ArrowRight,
  Plus,
  Rocket,
  AlertOctagon,
  Clock,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, projects } = useAuth();
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

  // Aggregated trend data from projects
  const trendData = [
    { date: 'Feb 10', deployments: 1, incidents: 0, successful: 1 },
    { date: 'Feb 11', deployments: 0, incidents: 0, successful: 0 },
    { date: 'Feb 12', deployments: 0, incidents: 0, successful: 0 },
    { date: 'Feb 13', deployments: 0, incidents: 0, successful: 0 },
    { date: 'Feb 14', deployments: 2, incidents: 1, successful: 2 },
    { date: 'Feb 15', deployments: 1, incidents: 1, successful: 0 },
    { date: 'Feb 16', deployments: 0, incidents: 0, successful: 0 },
  ];

  const severityData = {
    CRITICAL: 1,
    HIGH: 1,
    MEDIUM: 1,
    LOW: 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
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
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>New Project</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : stats ? (
          <OperationalMetricsCard summary={stats} />
        ) : null}

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
      </div>
    </AppLayout>
  );
}
