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
  ExternalLink,
  GitBranch,
} from 'lucide-react';

export default function ProjectsPage() {
  const { refreshProjects } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getProjects();
        if (res.projects) {
          setProjects(res.projects);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Software Projects</h1>
            <p className="text-xs text-slate-400">
              Repositories and services configured for incident correlation and deployment tracking.
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center space-y-3">
            <Layers className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Projects Configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first project to start tracking production deployments and correlated incident investigations.
            </p>
            <Link href="/projects/new">
              <Button size="sm" className="bg-indigo-600">Create Project</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="group block">
                <Card className="h-full border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80 transition-all flex flex-col justify-between">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors">
                        {p.name}
                      </span>
                      <Badge
                        variant={
                          p.environment === 'PRODUCTION'
                            ? 'destructive'
                            : p.environment === 'STAGING'
                            ? 'medium'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {p.environment}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {p.description || 'No description provided.'}
                    </p>

                    {p.repoUrl && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 truncate">
                        <GitBranch className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.repoUrl}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded bg-slate-950/60 p-1.5">
                        <div className="text-[10px] text-slate-500 uppercase font-mono">Members</div>
                        <div className="text-slate-200 font-bold">{p.memberCount || 1}</div>
                      </div>
                      <div className="rounded bg-slate-950/60 p-1.5">
                        <div className="text-[10px] text-slate-500 uppercase font-mono">Deploys</div>
                        <div className="text-cyan-400 font-bold">{p.deploymentCount || 0}</div>
                      </div>
                      <div className="rounded bg-slate-950/60 p-1.5">
                        <div className="text-[10px] text-slate-500 uppercase font-mono">Incidents</div>
                        <div className={`font-bold ${p.incidentCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {p.incidentCount || 0}
                        </div>
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
