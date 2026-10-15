'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertOctagon, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewIncidentPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL');
  const [occurredAt, setOccurredAt] = useState('');
  const [linkedDeploymentId, setLinkedDeploymentId] = useState('');
  const [linkConfidence, setLinkConfidence] = useState<'high' | 'medium' | 'low'>('high');
  const [linkNote, setLinkNote] = useState('');
  const [deployments, setDeployments] = useState<any[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDeploys() {
      try {
        const res = await api.getDeployments(projectId);
        if (res.deployments) {
          setDeployments(res.deployments);
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (projectId) loadDeploys();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.createIncident(projectId, {
        title,
        description: description || undefined,
        severity,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        linkedDeploymentId: linkedDeploymentId || undefined,
        linkConfidence: linkedDeploymentId ? linkConfidence : undefined,
        linkNote: linkedDeploymentId ? linkNote : undefined,
      });

      if (res.incident) {
        router.push(`/projects/${projectId}/incidents/${res.incident.id}`);
      } else {
        router.push(`/projects/${projectId}/incidents`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to report incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href={`/projects/${projectId}/incidents`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Incidents</span>
        </Link>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-400" />
              <span>Report Production Failure Incident</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Opens an investigation workspace and initializes forensic timeline tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Incident Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Elevated 502 Spike on /api/v2/settle Endpoint"
                  required
                  className="bg-slate-950 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e: any) => setSeverity(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CRITICAL">CRITICAL (System outage, customer data risk)</option>
                    <option value="HIGH">HIGH (Degraded core workflow, partial loss)</option>
                    <option value="MEDIUM">MEDIUM (Non-blocking bug, isolated scope)</option>
                    <option value="LOW">LOW (Cosmetic or minor operational discrepancy)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Failure Occurrence Time (UTC)</label>
                  <Input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="bg-slate-950 text-xs"
                  />
                  <span className="text-[10px] text-slate-500">Leave blank to use current time</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Failure Description & Initial Symptoms</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Observed error rates, affected services, customer reports, socket metrics..."
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 h-24 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Optional Correlated Deployment */}
              <div className="border-t border-slate-800/80 pt-3 space-y-3">
                <div className="text-xs font-semibold text-indigo-300">
                  Initial Deployment Association (Optional)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Suspected Deployment</label>
                    <select
                      value={linkedDeploymentId}
                      onChange={(e) => setLinkedDeploymentId(e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">None / Pending Investigation</option>
                      {deployments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.version} ({d.environment}) — commit {d.commitSha?.substring(0, 7)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {linkedDeploymentId && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Correlation Confidence</label>
                      <select
                        value={linkConfidence}
                        onChange={(e: any) => setLinkConfidence(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="high">High (Immediate temporal alignment)</option>
                        <option value="medium">Medium (Plausible timeframe)</option>
                        <option value="low">Low (Investigative lead)</option>
                      </select>
                    </div>
                  )}
                </div>

                {linkedDeploymentId && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Association Rationale</label>
                    <Input
                      value={linkNote}
                      onChange={(e) => setLinkNote(e.target.value)}
                      placeholder="Why is this deployment suspected? (e.g. onset matched rollout finish)"
                      className="bg-slate-950 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Link href={`/projects/${projectId}/incidents`}>
                  <Button type="button" variant="ghost" size="sm" className="text-xs">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading || !title.trim()}
                  size="sm"
                  className="bg-red-600 hover:bg-red-500 text-white text-xs"
                >
                  {loading ? 'Creating...' : 'Open Investigation Workspace'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
