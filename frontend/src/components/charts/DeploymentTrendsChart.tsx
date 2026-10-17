'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface Props {
  data: Array<{
    date: string;
    deployments: number;
    incidents: number;
    successful: number;
  }>;
}

export function DeploymentTrendsChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-foreground-muted border border-dashed border-border rounded-md">
        No deployment or incident trend telemetry available for this range.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--foreground-muted)" fontSize={11} tickLine={false} />
          <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'var(--foreground)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend
            verticalAlign="top"
            height={32}
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', color: 'var(--foreground-secondary)' }}
          />
          <Bar dataKey="successful" name="Successful Deploys" fill="var(--success)" radius={[2, 2, 0, 0]} barSize={12} />
          <Bar dataKey="incidents" name="Incidents Reported" fill="var(--destructive)" radius={[2, 2, 0, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
