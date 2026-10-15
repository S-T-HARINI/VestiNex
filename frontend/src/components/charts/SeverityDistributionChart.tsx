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
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#64748b',
};

export function SeverityDistributionChart({ distribution }: Props) {
  const data = [
    { name: 'Critical', count: distribution.CRITICAL, key: 'CRITICAL' },
    { name: 'High', count: distribution.HIGH, key: 'HIGH' },
    { name: 'Medium', count: distribution.MEDIUM, key: 'MEDIUM' },
    { name: 'Low', count: distribution.LOW, key: 'LOW' },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={60} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#f8fafc',
            }}
          />
          <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry) => (
              <Cell key={`cell-${entry.key}`} fill={SEVERITY_COLORS[entry.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
