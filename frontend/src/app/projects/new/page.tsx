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
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Projects</span>
        </Link>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-white">Create New Software Project</CardTitle>
            <CardDescription className="text-xs">
              Establish a monitoring scope for tracking deployments, commits, and incident forensics.
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
                <label className="font-semibold text-slate-300">Project Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Customer Portal API, Mobile Banking Backend, E-Commerce Storefront, SaaS Auth Service"
                  required
                  className="bg-slate-950 text-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Name any software system, mobile app, API microservice, or backend pipeline.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of this service scope, architecture, core dependencies, or mission-critical SLAs..."
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 h-24 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Repository URL</label>
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/your-org/your-repo.git"
                  type="url"
                  className="bg-slate-950 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Primary Monitored Environment</label>
                <select
                  value={environment}
                  onChange={(e: any) => setEnvironment(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="PRODUCTION">PRODUCTION (Live customer traffic)</option>
                  <option value="STAGING">STAGING (Pre-release testing tier)</option>
                  <option value="DEVELOPMENT">DEVELOPMENT (Integration environment)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Link href="/projects">
                  <Button type="button" variant="ghost" size="sm" className="text-xs">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !name.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs">
                  {loading ? 'Creating...' : 'Initialize Project'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
