'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface Props {
  distribution: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--error)',
  HIGH: 'var(--warning)',
  MEDIUM: 'var(--warning)',
  LOW: 'var(--neutral)',
};

export function SeverityDistributionChart({ distribution }: Props) {
  const total =
    (distribution?.CRITICAL || 0) +
    (distribution?.HIGH || 0) +
    (distribution?.MEDIUM || 0) +
    (distribution?.LOW || 0);

  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-foreground-muted border border-dashed border-border rounded-md">
        No active or historic incidents reported.
      </div>
    );
  }

  const data = [
    { name: 'Critical', count: distribution.CRITICAL, key: 'CRITICAL' },
    { name: 'High', count: distribution.HIGH, key: 'HIGH' },
    { name: 'Medium', count: distribution.MEDIUM, key: 'MEDIUM' },
    { name: 'Low', count: distribution.LOW, key: 'LOW' },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis type="number" stroke="var(--foreground-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
          <YAxis dataKey="name" type="category" stroke="var(--foreground-secondary)" fontSize={11} tickLine={false} width={60} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'var(--foreground)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            itemStyle={{ color: 'var(--foreground)' }}
          />
          <Bar dataKey="count" name="Incidents" radius={[0, 3, 3, 0]} barSize={14}>
            {data.map((entry) => (
              <Cell key={`cell-${entry.key}`} fill={SEVERITY_COLORS[entry.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
