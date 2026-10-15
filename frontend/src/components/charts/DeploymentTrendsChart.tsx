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
      <div className="flex h-64 items-center justify-center text-xs text-slate-500">
        No deployment or incident trend data available for this range.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#f8fafc',
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
          />
          <Bar dataKey="successful" name="Successful Deploys" fill="#10b981" radius={[3, 3, 0, 0]} barSize={14} />
          <Bar dataKey="incidents" name="Incidents Reported" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
