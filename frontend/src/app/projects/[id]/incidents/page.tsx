'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatTimeRelative } from '@/lib/utils';
import {
  AlertOctagon,
  Plus,
  Filter,
  Link2,
  Clock,
  ArrowRight,
  User,
  MessageSquare,
} from 'lucide-react';

export default function IncidentsListPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadIncidents = async () => {
    try {
      const res = await api.getIncidents(projectId, {
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      });
      if (res.incidents) {
        setIncidents(res.incidents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadIncidents();
  }, [projectId, severityFilter, statusFilter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-400" />
              <span>Incident Investigation Log</span>
            </h1>
            <p className="text-xs text-slate-400">
              Correlated production failures, root causes, and forensic timelines.
            </p>
          </div>

          <Link href={`/projects/${projectId}/incidents/new`}>
            <Button size="sm" variant="destructive" className="bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Open New Incident</span>
            </Button>
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="IDENTIFIED">IDENTIFIED</option>
            <option value="MONITORING">MONITORING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          {(severityFilter || statusFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSeverityFilter('');
                setStatusFilter('');
              }}
              className="h-7 text-xs text-slate-400 hover:text-slate-200"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Incidents Table / List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center space-y-2">
            <AlertOctagon className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Incidents Found</h3>
            <p className="text-xs text-slate-500">
              No incidents matching the active filter criteria are recorded for this project.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/projects/${projectId}/incidents/${inc.id}`}
                className="group block rounded-lg border border-slate-800 bg-slate-900/40 p-4 hover:border-slate-700 hover:bg-slate-900/70 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={inc.severity.toLowerCase() as any} className="text-[10px]">
                        {inc.severity}
                      </Badge>
                      <Badge
                        variant={
                          inc.status === 'RESOLVED'
                            ? 'success'
                            : inc.status === 'INVESTIGATING'
                            ? 'running'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {inc.status}
                      </Badge>
                      <span className="font-mono text-xs text-slate-500">{inc.id}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {inc.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-1 max-w-3xl">
                      {inc.description || 'No description logged.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                    {inc.linkedDeploymentCount > 0 && (
                      <div className="flex items-center gap-1 text-indigo-400">
                        <Link2 className="h-3.5 w-3.5" />
                        <span>{inc.linkedDeploymentCount} linked</span>
                      </div>
                    )}

                    {inc.commentCount > 0 && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{inc.commentCount}</span>
                      </div>
                    )}

                    <div className="text-right">
                      <div className="font-mono text-slate-300">{formatDate(inc.occurredAt)}</div>
                      <div className="text-[10px] text-slate-500">Lead: {inc.assignedTo?.name || 'Unassigned'}</div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
