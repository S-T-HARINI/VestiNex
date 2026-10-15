'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatTimeRelative } from '@/lib/utils';
import {
  History,
  Filter,
  AlertTriangle,
  Clock,
  Rocket,
  AlertOctagon,
  GitBranch,
  CheckCircle2,
  Layers,
  MessageSquare,
} from 'lucide-react';

export default function TimelinePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [outOfOrderOnly, setOutOfOrderOnly] = useState(false);

  const loadTimeline = async () => {
    try {
      const res = await api.getProjectTimeline(projectId, {
        type: typeFilter || undefined,
        delayedOnly,
        outOfOrderOnly,
      });
      if (res.events) {
        setEvents(res.events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadTimeline();
  }, [projectId, typeFilter, delayedOnly, outOfOrderOnly]);

  const getEventIcon = (type: string) => {
    if (type.startsWith('DEPLOYMENT')) return <Rocket className="h-4 w-4 text-cyan-400" />;
    if (type.startsWith('INCIDENT_RESOLVED')) return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (type.startsWith('INCIDENT')) return <AlertOctagon className="h-4 w-4 text-red-400" />;
    if (type.startsWith('CODE_CHANGE')) return <GitBranch className="h-4 w-4 text-indigo-400" />;
    if (type.startsWith('COMMENT')) return <MessageSquare className="h-4 w-4 text-slate-400" />;
    return <Layers className="h-4 w-4 text-slate-400" />;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-400" />
              <span>Unified Chronological Event Timeline</span>
            </h1>
            <p className="text-xs text-slate-400">
              Reconstructing true event occurrence vs. telemetry ingestion latency and out-of-order logs.
            </p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Event Types</option>
            <option value="INCIDENT_CREATED">Incidents Created</option>
            <option value="INCIDENT_STATUS_CHANGED">Incident Status Changes</option>
            <option value="DEPLOYMENT_CREATED">Deployments Initiated</option>
            <option value="DEPLOYMENT_STATUS_CHANGED">Deployment Status Changes</option>
            <option value="CODE_CHANGE_RECORDED">Code Commits</option>
          </select>

          <Button
            size="sm"
            variant={delayedOnly ? 'destructive' : 'outline'}
            onClick={() => setDelayedOnly(!delayedOnly)}
            className="h-7 text-xs gap-1 font-mono"
          >
            <Clock className="h-3 w-3" />
            <span>Delayed Ingest Only</span>
          </Button>

          <Button
            size="sm"
            variant={outOfOrderOnly ? 'destructive' : 'outline'}
            onClick={() => setOutOfOrderOnly(!outOfOrderOnly)}
            className="h-7 text-xs gap-1 font-mono"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Out-of-Order Only</span>
          </Button>

          {(typeFilter || delayedOnly || outOfOrderOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter('');
                setDelayedOnly(false);
                setOutOfOrderOnly(false);
              }}
              className="h-7 text-xs text-slate-400"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Timeline Events Stream */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center text-xs text-slate-500">
            No events match the selected criteria.
          </div>
        ) : (
          <div className="relative pl-8 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {events.map((event) => (
              <div key={event.id} className="relative group">
                <div className="absolute -left-8 top-3 h-6 w-6 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center shadow">
                  {getEventIcon(event.type)}
                </div>

                <div
                  className={`rounded-lg border p-4 space-y-2 text-xs transition-colors ${
                    event.isOutOfOrder
                      ? 'border-amber-500/40 bg-amber-950/15'
                      : event.type.startsWith('INCIDENT')
                      ? 'border-red-500/20 bg-slate-900/60'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{event.title}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {event.type}
                      </Badge>
                      {event.isDelayed && (
                        <Badge variant="delayed" className="text-[10px]">
                          Delayed Telemetry (+{event.delaySeconds}s)
                        </Badge>
                      )}
                      {event.isOutOfOrder && (
                        <Badge variant="critical" className="text-[10px]">
                          Out-of-Order Ingestion
                        </Badge>
                      )}
                    </div>

                    <div className="text-right font-mono text-[11px] text-slate-400">
                      {formatDate(event.occurredAt)}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{event.description}</p>

                  {/* Dual timestamps display */}
                  <div className="flex items-center gap-4 pt-1 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                    <div>
                      Occurred: <span className="text-slate-300">{formatDate(event.occurredAt)}</span>
                    </div>
                    <div>
                      Ingested: <span className="text-slate-300">{formatDate(event.ingestedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
