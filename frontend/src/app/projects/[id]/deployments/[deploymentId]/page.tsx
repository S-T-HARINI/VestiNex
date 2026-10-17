'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/ui/copy-button';
import { formatDate, formatTimeRelative } from '@/lib/utils';
import {
  Rocket,
  ArrowLeft,
  GitCommit,
  ExternalLink,
  Clock,
  AlertOctagon,
  RotateCcw,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';

export default function DeploymentDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const deploymentId = params.deploymentId as string;

  const [deployment, setDeployment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.getDeployment(deploymentId);
      if (res.deployment) {
        setDeployment(res.deployment);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deploymentId) loadData();
  }, [deploymentId]);

  const handleStatusUpdate = async (status: string) => {
    try {
      await api.updateDeploymentStatus(deploymentId, status, `Manual action to mark ${status}`);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </AppLayout>
    );
  }

  if (!deployment) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-xs text-foreground-muted">
          Deployment not found or access denied.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Link
          href={`/projects/${projectId}/deployments`}
          className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Deployments</span>
        </Link>

        {/* Header Summary */}
        <div className="rounded-md border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {deployment.environment}
                </Badge>
                <Badge
                  variant={
                    deployment.status === 'SUCCESSFUL'
                      ? 'success'
                      : deployment.status === 'FAILED'
                      ? 'destructive'
                      : deployment.status === 'RUNNING'
                      ? 'running'
                      : deployment.status === 'ROLLED_BACK'
                      ? 'rolled_back'
                      : 'outline'
                  }
                  className="text-xs"
                >
                  {deployment.status}
                </Badge>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs text-foreground-muted">{deployment.id}</span>
                  <CopyButton text={deployment.id} />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-foreground font-mono">{deployment.version}</h1>
              <p className="text-xs text-foreground-secondary max-w-2xl">{deployment.releaseNotes || 'No release notes.'}</p>
            </div>

            <div className="flex items-center gap-2">
              {deployment.status === 'RUNNING' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate('SUCCESSFUL')}
                  className="text-xs"
                >
                  Mark as Successful
                </Button>
              )}
              {deployment.status === 'SUCCESSFUL' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusUpdate('ROLLED_BACK')}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Trigger Rollback
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-4 text-xs font-mono tabular-nums">
            <div>
              <div className="text-[10px] uppercase text-foreground-muted font-sans font-medium">Commit SHA</div>
              <div className="text-foreground mt-0.5 flex items-center gap-1.5">
                <span>{deployment.commitSha?.substring(0, 7)}</span>
                <CopyButton text={deployment.commitSha} />
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-foreground-muted font-sans font-medium">Branch</div>
              <div className="text-foreground mt-0.5">{deployment.branch}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-foreground-muted font-sans font-medium">Deploy Initiated</div>
              <div className="text-foreground mt-0.5">{formatDate(deployment.occurredAt)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-foreground-muted font-sans font-medium">Deploy Completed</div>
              <div className="text-foreground mt-0.5">{deployment.completedAt ? formatDate(deployment.completedAt) : 'In progress'}</div>
            </div>
          </div>
        </div>

        {/* 2-Col Grid: Status Transition History & Linked Incidents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Transition History (Audit Trail) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span>Lifecycle Status History (Audit Trail)</span>
              </CardTitle>
              <CardDescription>
                Chronological record of deployment state transitions and audit reasons.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {deployment.statusHistory?.map((hist: any) => (
                  <div key={hist.id} className="relative">
                    <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border border-border bg-card" />
                    <div className="rounded border border-border bg-surface p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {hist.fromStatus ? `${hist.fromStatus} → ${hist.toStatus}` : hist.toStatus}
                        </span>
                        <span className="font-mono tabular-nums text-[10px] text-foreground-muted">
                          {formatDate(hist.changedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground-secondary">{hist.note}</p>
                      <div className="text-[10px] text-foreground-muted">
                        Triggered by {hist.changedBy?.name || 'Automation Pipeline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Linked Failure Incidents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-status-error" />
                <span>Associated Incidents ({deployment.incidentLinks?.length || 0})</span>
              </CardTitle>
              <CardDescription>
                Incidents correlated to this deployment during forensic investigations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deployment.incidentLinks?.length === 0 ? (
                <div className="rounded border border-dashed border-border p-6 text-center text-xs text-foreground-muted">
                  No incidents currently linked to this deployment.
                </div>
              ) : (
                deployment.incidentLinks?.map((link: any) => (
                  <Link
                    key={link.id}
                    href={`/projects/${projectId}/incidents/${link.incidentId}`}
                    className="block rounded border border-border bg-surface p-3 hover:border-border-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground text-xs">
                        {link.incident?.title}
                      </span>
                      <Badge variant={link.incident?.severity?.toLowerCase()} className="text-[10px]">
                        {link.incident?.severity}
                      </Badge>
                    </div>
                    {link.note && (
                      <p className="mt-1 text-[11px] text-foreground-secondary italic">"{link.note}"</p>
                    )}
                    <div className="mt-2 text-[10px] text-foreground-muted">
                      Correlation Confidence: <span className="text-accent uppercase font-semibold">{link.confidence}</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
