'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const { refreshProjects, setActiveProject } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [environment, setEnvironment] = useState<'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'>('PRODUCTION');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.createProject({
        name,
        description,
        repoUrl: repoUrl || undefined,
        environment,
      });

      await refreshProjects();
      if (res.project) {
        setActiveProject(res.project);
        router.push(`/projects/${res.project.id}`);
      } else {
        router.push('/projects');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto space-y-4">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="h-3 w-3" />
          <span>Back to Projects</span>
        </Link>

        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Create New Software Project</CardTitle>
            <CardDescription className="text-xs text-foreground-secondary">
              Establish a monitoring scope for tracking deployments, commits, and incident forensics.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
            {error && (
              <div className="rounded-[5px] border border-status-error-border bg-status-error-bg p-2.5 text-xs text-status-error flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-status-error" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Project Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Customer Portal API"
                  required
                />
                <p className="text-[11px] text-foreground-muted">
                  Name any software system, mobile app, API microservice, or backend pipeline.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of this service scope, architecture, core dependencies, or mission-critical SLAs..."
                  className="w-full rounded-[6px] border border-border bg-background p-2.5 text-xs text-foreground h-20 placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Public GitHub Repository URL</label>
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/expressjs/express.git"
                  type="url"
                />
                <p className="text-[11px] text-foreground-muted">
                  Connect public GitHub repositories to sync commit history and correlate releases with failures.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Primary Monitored Environment</label>
                <select
                  value={environment}
                  onChange={(e: any) => setEnvironment(e.target.value)}
                  className="w-full rounded-[6px] border border-border bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer"
                >
                  <option value="PRODUCTION">PRODUCTION (Live customer traffic)</option>
                  <option value="STAGING">STAGING (Pre-release testing tier)</option>
                  <option value="DEVELOPMENT">DEVELOPMENT (Integration environment)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Link href="/projects">
                  <Button type="button" variant="outline" size="sm" className="text-xs">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !name.trim()} size="sm" className="text-xs font-medium">
                  {loading ? 'Initializing...' : 'Initialize Project'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
