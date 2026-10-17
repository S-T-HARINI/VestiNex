'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/ui/copy-button';
import { formatDate } from '@/lib/utils';
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
  RotateCcw,
  Sparkles,
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

  const getEventDotColor = (type: string) => {
    if (type.startsWith('INCIDENT_RESOLVED')) return 'bg-status-success';
    if (type.startsWith('INCIDENT')) return 'bg-status-error';
    if (type.startsWith('DEPLOYMENT')) return 'bg-primary';
    if (type.startsWith('CODE_CHANGE')) return 'bg-foreground-muted';
    return 'bg-foreground-muted';
  };

  const getEventIcon = (type: string) => {
    if (type.startsWith('DEPLOYMENT')) return <Rocket className="h-3 w-3 text-primary" />;
    if (type.startsWith('INCIDENT_RESOLVED')) return <CheckCircle2 className="h-3 w-3 text-status-success" />;
    if (type.startsWith('INCIDENT')) return <AlertOctagon className="h-3 w-3 text-status-error" />;
    if (type.startsWith('CODE_CHANGE')) return <GitBranch className="h-3 w-3 text-foreground-secondary" />;
    if (type.startsWith('COMMENT')) return <MessageSquare className="h-3 w-3 text-foreground-secondary" />;
    return <Layers className="h-3 w-3 text-foreground-muted" />;
  };

  // Extract commit SHA if present in title or description
  const extractSha = (text: string) => {
    const match = text.match(/\b([0-9a-f]{7,40})\b/i);
    return match ? match[1] : null;
  };

  const delayedCount = events.filter((e) => e.isDelayed).length;
  const outOfOrderCount = events.filter((e) => e.isOutOfOrder).length;

  return (
    <AppLayout>
      <div className="space-y-5 max-w-5xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold text-foreground tracking-tight">
                Unified Chronological Event Timeline
              </h1>
            </div>
            <p className="text-xs text-foreground-secondary">
              Reconstructing true event occurrence vs. telemetry ingestion latency and out-of-order logs.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="rounded border border-border bg-surface px-2 py-0.5 text-foreground-secondary">
              <strong className="text-foreground">{events.length}</strong> events
            </span>
            {delayedCount > 0 && (
              <span className="rounded border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-status-warning-text">
                {delayedCount} delayed
              </span>
            )}
            {outOfOrderCount > 0 && (
              <span className="rounded border border-status-error-border bg-status-error-bg px-2 py-0.5 text-status-error-text">
                {outOfOrderCount} out-of-order
              </span>
            )}
          </div>
        </div>

        {/* Minimal Engineering Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-border bg-surface/50 p-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-foreground-secondary text-xs pl-1 pr-2 border-r border-border font-medium">
              <Filter className="h-3 w-3 text-foreground-muted" />
              <span>Filter:</span>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by event type"
              className="rounded border border-border bg-input px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Event Types</option>
              <option value="INCIDENT_CREATED">Incidents Created</option>
              <option value="INCIDENT_STATUS_CHANGED">Incident Status Changes</option>
              <option value="DEPLOYMENT_CREATED">Deployments Initiated</option>
              <option value="DEPLOYMENT_STATUS_CHANGED">Deployment Status Changes</option>
              <option value="CODE_CHANGE_RECORDED">Code Commits</option>
            </select>

            <button
              type="button"
              onClick={() => setDelayedOnly(!delayedOnly)}
              aria-pressed={delayedOnly}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
                delayedOnly
                  ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text font-semibold'
                  : 'border-border bg-background text-foreground-secondary hover:text-foreground hover:bg-surface'
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>Delayed Ingest Only</span>
              {delayedCount > 0 && (
                <span className="ml-0.5 rounded-full bg-status-warning-border px-1 py-0 text-[10px] text-status-warning-text">
                  {delayedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setOutOfOrderOnly(!outOfOrderOnly)}
              aria-pressed={outOfOrderOnly}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
                outOfOrderOnly
                  ? 'border-status-error-border bg-status-error-bg text-status-error-text font-semibold'
                  : 'border-border bg-background text-foreground-secondary hover:text-foreground hover:bg-surface'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Out-of-Order Only</span>
              {outOfOrderCount > 0 && (
                <span className="ml-0.5 rounded-full bg-status-error-border px-1 py-0 text-[10px] text-status-error-text">
                  {outOfOrderCount}
                </span>
              )}
            </button>
          </div>

          {(typeFilter || delayedOnly || outOfOrderOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter('');
                setDelayedOnly(false);
                setOutOfOrderOnly(false);
              }}
              className="h-7 text-xs text-foreground-muted hover:text-foreground gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Engineering Event Stream (Streamlined list with subtle separators, NO chunky cards) */}
        {loading ? (
          <div className="rounded-md border border-border bg-card p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-4 w-28 shrink-0" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-12 text-center text-xs text-foreground-muted space-y-1">
            <History className="h-6 w-6 text-foreground-muted mx-auto mb-2 opacity-60" />
            <div className="font-medium text-foreground">No matching timeline events</div>
            <p className="text-foreground-secondary">
              No occurrences match the active filter criteria. Try resetting your filters.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {events.map((event, idx) => {
                const commitSha = extractSha(event.title) || extractSha(event.description || '');

                return (
                  <div
                    key={event.id || idx}
                    className="group flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-4 p-3.5 hover:bg-surface/80 hover:shadow-xs transition-all duration-200 motion-reduce:transition-none"
                  >
                    {/* Timestamp column (consistent tabular alignment) */}
                    <div className="sm:w-36 shrink-0 flex items-center sm:flex-col sm:items-start justify-between sm:justify-start gap-1 font-mono text-[11px] tabular-nums">
                      <span className="font-medium text-foreground">
                        {formatDate(event.occurredAt).split(',')[1]?.trim() || formatDate(event.occurredAt)}
                      </span>
                      <span className="text-[10px] text-foreground-muted">
                        {formatDate(event.occurredAt).split(',')[0]}
                      </span>
                    </div>

                    {/* Timeline Node indicator */}
                    <div className="hidden sm:flex flex-col items-center self-stretch shrink-0 pt-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface border border-border">
                        {getEventIcon(event.type)}
                      </div>
                    </div>

                    {/* Event Detail Stream Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Title row with type, anomaly badges, and commit pill */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground tracking-tight">
                          {event.title}
                        </span>

                        <span className="font-mono text-[10px] text-foreground-muted bg-surface px-1.5 py-0.2 rounded border border-border uppercase tracking-wider">
                          {event.type}
                        </span>

                        {commitSha && (
                          <div className="inline-flex items-center gap-1 rounded bg-surface border border-border px-1.5 py-0.2 font-mono text-[10px] text-foreground-secondary">
                            <span>git:{commitSha.substring(0, 7)}</span>
                            <CopyButton text={commitSha} />
                          </div>
                        )}

                        {event.isDelayed && (
                          <Badge variant="delayed" className="text-[10px] py-0 gap-1 font-mono">
                            <Clock className="h-2.5 w-2.5" />
                            <span>Delayed Telemetry (+{event.delaySeconds}s)</span>
                          </Badge>
                        )}

                        {event.isOutOfOrder && (
                          <Badge variant="critical" className="text-[10px] py-0 gap-1 font-mono">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            <span>Out-of-Order Ingestion</span>
                          </Badge>
                        )}
                      </div>

                      {/* Description / Log Summary */}
                      {event.description && (
                        <p className="text-xs text-foreground-secondary leading-relaxed font-sans">
                          {event.description}
                        </p>
                      )}

                      {/* Telemetry Timing Line (Occurrence vs Ingestion) */}
                      <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums text-foreground-muted pt-0.5 flex-wrap">
                        <span>
                          Occurred: <span className="text-foreground-secondary font-medium">{formatDate(event.occurredAt)}</span>
                        </span>
                        <span>•</span>
                        <span>
                          Ingested: <span className="text-foreground-secondary font-medium">{formatDate(event.ingestedAt)}</span>
                        </span>
                        {event.isDelayed && event.delaySeconds && (
                          <>
                            <span>•</span>
                            <span className="text-status-warning">
                              Lag: +{Math.round(event.delaySeconds / 60)}m {event.delaySeconds % 60}s
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
