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
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!deployment) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-xs text-slate-500">
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
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Deployments</span>
        </Link>

        {/* Header Summary */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 space-y-4">
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
                <span className="font-mono text-xs text-slate-400">{deployment.id}</span>
              </div>
              <h1 className="text-xl font-bold text-white font-mono">{deployment.version}</h1>
              <p className="text-xs text-slate-300 max-w-2xl">{deployment.releaseNotes || 'No release notes.'}</p>
            </div>

            <div className="flex items-center gap-2">
              {deployment.status === 'RUNNING' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate('SUCCESSFUL')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
                >
                  Mark as Successful
                </Button>
              )}
              {deployment.status === 'SUCCESSFUL' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusUpdate('ROLLED_BACK')}
                  className="text-xs text-purple-300 border-purple-500/30 hover:bg-purple-950/20"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Trigger Rollback
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800/80 pt-4 text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-sans">Commit SHA</div>
              <div className="text-slate-200 mt-0.5">{deployment.commitSha?.substring(0, 7)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-sans">Branch</div>
              <div className="text-slate-200 mt-0.5">{deployment.branch}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-sans">Deploy Initiated</div>
              <div className="text-slate-200 mt-0.5">{formatDate(deployment.occurredAt)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-sans">Deploy Completed</div>
              <div className="text-slate-200 mt-0.5">{deployment.completedAt ? formatDate(deployment.completedAt) : 'In progress'}</div>
            </div>
          </div>
        </div>

        {/* 2-Col Grid: Status Transition History & Linked Incidents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Transition History (Audit Trail) */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Lifecycle Status History (Audit Trail)</span>
              </CardTitle>
              <CardDescription>
                Chronological record of deployment state transitions and audit reasons.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {deployment.statusHistory?.map((hist: any) => (
                  <div key={hist.id} className="relative">
                    <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border border-slate-600 bg-slate-900" />
                    <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          {hist.fromStatus ? `${hist.fromStatus} → ${hist.toStatus}` : hist.toStatus}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {formatDate(hist.changedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">{hist.note}</p>
                      <div className="text-[10px] text-slate-500">
                        Triggered by {hist.changedBy?.name || 'Automation Pipeline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Linked Failure Incidents */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-red-400" />
                <span>Associated Incidents ({deployment.incidentLinks?.length || 0})</span>
              </CardTitle>
              <CardDescription>
                Incidents correlated to this deployment during forensic investigations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deployment.incidentLinks?.length === 0 ? (
                <div className="rounded border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                  No incidents currently linked to this deployment.
                </div>
              ) : (
                deployment.incidentLinks?.map((link: any) => (
                  <Link
                    key={link.id}
                    href={`/projects/${projectId}/incidents/${link.incidentId}`}
                    className="block rounded border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs">
                        {link.incident?.title}
                      </span>
                      <Badge variant={link.incident?.severity?.toLowerCase()} className="text-[10px]">
                        {link.incident?.severity}
                      </Badge>
                    </div>
                    {link.note && (
                      <p className="mt-1 text-[11px] text-slate-300 italic">"{link.note}"</p>
                    )}
                    <div className="mt-2 text-[10px] text-slate-500">
                      Correlation Confidence: <span className="text-indigo-400 uppercase font-semibold">{link.confidence}</span>
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
