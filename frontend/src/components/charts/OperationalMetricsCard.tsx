import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertOctagon, Rocket, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  summary: {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    deploymentSuccessRate: number;
    totalIncidents: number;
    openIncidents: number;
    criticalIncidents: number;
    mttrMinutes: number;
  };
}

export function OperationalMetricsCard({ summary }: Props) {
  const metrics = [
    {
      label: 'Open Incidents',
      value: summary.openIncidents,
      subValue: summary.totalIncidents > 0
        ? `${summary.criticalIncidents} Critical Severity`
        : 'No incidents recorded',
      icon: AlertOctagon,
      color: summary.criticalIncidents > 0 ? 'text-red-400' : 'text-slate-200',
      border: summary.criticalIncidents > 0 ? 'border-red-500/30' : 'border-slate-800',
      bg: summary.criticalIncidents > 0 ? 'bg-red-950/20' : 'bg-slate-900/60',
    },
    {
      label: 'Deploy Success Rate',
      value: summary.totalDeployments > 0 ? `${summary.deploymentSuccessRate}%` : '—',
      subValue: summary.totalDeployments > 0
        ? `${summary.successfulDeployments} of ${summary.totalDeployments} Succeeded`
        : 'No deployments recorded',
      icon: CheckCircle2,
      color: summary.totalDeployments > 0 ? 'text-emerald-400' : 'text-slate-400',
      border: 'border-slate-800',
      bg: 'bg-slate-900/60',
    },
    {
      label: 'Mean Time to Resolution',
      value: summary.mttrMinutes > 0 ? `${summary.mttrMinutes}m` : '—',
      subValue: summary.mttrMinutes > 0 ? 'Based on closed incident life-cycles' : 'No resolved incidents yet',
      icon: Clock,
      color: summary.mttrMinutes > 0 ? 'text-indigo-400' : 'text-slate-400',
      border: 'border-slate-800',
      bg: 'bg-slate-900/60',
    },
    {
      label: 'Total Deployments',
      value: summary.totalDeployments,
      subValue: summary.totalDeployments > 0 ? `${summary.failedDeployments} Failures logged` : 'No deployments logged',
      icon: Rocket,
      color: summary.totalDeployments > 0 ? 'text-cyan-400' : 'text-slate-400',
      border: 'border-slate-800',
      bg: 'bg-slate-900/60',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.label} className={`border ${m.border} ${m.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{m.label}</span>
                <Icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <div className={`mt-2 text-2xl font-bold font-mono tracking-tight ${m.color}`}>
                {m.value}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 truncate">{m.subValue}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
