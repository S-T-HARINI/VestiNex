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
      valueColor: summary.criticalIncidents > 0 ? 'text-status-error' : 'text-foreground',
      iconColor: summary.criticalIncidents > 0 ? 'text-status-error' : 'text-foreground-muted',
    },
    {
      label: 'Deploy Success Rate',
      value: summary.totalDeployments > 0 ? `${summary.deploymentSuccessRate}%` : '—',
      subValue: summary.totalDeployments > 0
        ? `${summary.successfulDeployments} of ${summary.totalDeployments} succeeded`
        : 'No deployments recorded',
      icon: CheckCircle2,
      valueColor: summary.totalDeployments > 0 ? 'text-status-success' : 'text-foreground',
      iconColor: summary.totalDeployments > 0 ? 'text-status-success' : 'text-foreground-muted',
    },
    {
      label: 'Mean Time to Resolution',
      value: summary.mttrMinutes > 0 ? `${summary.mttrMinutes}m` : '—',
      subValue: summary.mttrMinutes > 0 ? 'Based on resolved incidents' : 'No resolved incidents yet',
      icon: Clock,
      valueColor: 'text-foreground',
      iconColor: 'text-primary',
    },
    {
      label: 'Total Deployments',
      value: summary.totalDeployments,
      subValue: summary.totalDeployments > 0 ? `${summary.failedDeployments} failures logged` : 'No deployments logged',
      icon: Rocket,
      valueColor: 'text-foreground',
      iconColor: 'text-foreground-muted',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.label} className="border border-border bg-card">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs text-foreground-secondary">
                <span className="font-medium">{m.label}</span>
                <Icon className={`h-3.5 w-3.5 ${m.iconColor}`} />
              </div>
              <div className={`mt-1.5 text-2xl font-bold font-mono tabular-nums ${m.valueColor}`}>
                {m.value}
              </div>
              <div className="mt-1 text-[11px] text-foreground-muted truncate">{m.subValue}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
