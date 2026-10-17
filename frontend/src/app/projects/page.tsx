'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Layers,
  Plus,
  Rocket,
  AlertOctagon,
  Users,
  GitBranch,
} from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    async function load() {
      try {
        const res = await api.getProjects();
        if (res.projects) {
          setProjects(res.projects);
        } else {
          setProjects([]);
        }
      } catch (err) {
        console.error(err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Software Projects
            </h1>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Repositories and services configured for incident correlation and deployment tracking.
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="sm" className="text-xs gap-1.5 font-medium">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center space-y-3 max-w-md mx-auto my-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-surface text-foreground-muted mx-auto border border-border">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No Projects Configured</h3>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              Create your first project to start tracking production deployments and correlated incident investigations.
            </p>
            <div className="pt-1">
              <Link href="/projects/new">
                <Button size="sm" className="text-xs font-medium">Create Project</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Card className="h-full border border-border bg-card hover:border-foreground-muted/70 hover:-translate-y-[2px] hover:shadow-sm transition-all duration-200 motion-reduce:transition-none motion-reduce:transform-none flex flex-col justify-between">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </span>
                      <Badge
                        variant={
                          p.environment === 'PRODUCTION'
                            ? 'critical'
                            : p.environment === 'STAGING'
                            ? 'high'
                            : 'outline'
                        }
                        className="text-[9px] uppercase font-mono px-1.5 py-0 shrink-0"
                      >
                        {p.environment}
                      </Badge>
                    </div>

                    <p className="text-xs text-foreground-secondary line-clamp-2 leading-relaxed">
                      {p.description || 'No description provided.'}
                    </p>

                    {p.repoUrl && (
                      <div className="flex items-center gap-1.5 text-[10px] text-foreground-muted font-mono truncate">
                        <GitBranch className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.repoUrl.replace(/^https:\/\/github\.com\//, '')}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-foreground-muted pt-2.5 border-t border-border font-mono">
                      <div className="flex items-center gap-1">
                        <AlertOctagon className="h-3 w-3 text-status-error" />
                        <span>{p.incidentCount || 0} incidents</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Rocket className="h-3 w-3 text-primary" />
                        <span>{p.deploymentCount || 0} deploys</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{p.memberCount || 1}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
