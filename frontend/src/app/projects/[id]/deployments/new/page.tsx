'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Rocket, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewDeploymentPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [version, setVersion] = useState('');
  const [commitSha, setCommitSha] = useState('');
  const [branch, setBranch] = useState('main');
  const [environment, setEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'DEVELOPMENT'>('PRODUCTION');
  const [status, setStatus] = useState<string>('SUCCESSFUL');
  const [buildUrl, setBuildUrl] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.createDeployment(projectId, {
        version,
        commitSha,
        branch,
        environment,
        status,
        buildUrl: buildUrl || undefined,
        releaseNotes: releaseNotes || undefined,
      });

      if (res.deployment) {
        router.push(`/projects/${projectId}/deployments/${res.deployment.id}`);
      } else {
        router.push(`/projects/${projectId}/deployments`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record deployment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href={`/projects/${projectId}/deployments`}
          className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Deployments</span>
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Rocket className="h-5 w-5 text-accent" />
              <span>Record New Deployment</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Registers release versions, Git commit references, and timestamps for incident correlation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-status-error/30 bg-status-error/10 p-2.5 text-xs text-status-error flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-status-error" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Version Tag *</label>
                  <Input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. v2.5.0 or 2025.02.14-prod"
                    required
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Target Environment</label>
                  <select
                    value={environment}
                    onChange={(e: any) => setEnvironment(e.target.value)}
                    className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="STAGING">STAGING</option>
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Git Commit SHA *</label>
                  <Input
                    value={commitSha}
                    onChange={(e) => setCommitSha(e.target.value)}
                    placeholder="e.g. 7c9a12b or full 40-char SHA"
                    required
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Branch Name</label>
                  <Input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main or release/v2.5"
                    required
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Initial Deployment Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="SUCCESSFUL">SUCCESSFUL</option>
                    <option value="RUNNING">RUNNING (In-progress rollout)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">CI/CD Build URL</label>
                  <Input
                    value={buildUrl}
                    onChange={(e) => setBuildUrl(e.target.value)}
                    placeholder="https://ci.vestinex.io/builds/9042"
                    type="url"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Release Notes / Changelog Summary</label>
                <textarea
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="Key features, database migrations applied, dependency updates, and configuration flags..."
                  className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground h-24 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Link href={`/projects/${projectId}/deployments`}>
                  <Button type="button" variant="ghost" size="sm" className="text-xs">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading || !version.trim() || !commitSha.trim()}
                  size="sm"
                  className="text-xs"
                >
                  {loading ? 'Recording...' : 'Register Deployment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
