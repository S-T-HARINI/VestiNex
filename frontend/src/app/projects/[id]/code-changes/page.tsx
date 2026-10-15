'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatTimeRelative } from '@/lib/utils';
import { GitBranch, GitCommit, Rocket, ExternalLink, Plus } from 'lucide-react';

export default function CodeChangesPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [codeChanges, setCodeChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getCodeChanges(projectId);
        if (res.codeChanges) setCodeChanges(res.codeChanges);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) load();
  }, [projectId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-indigo-400" />
              <span>Git Commits & Code Changes</span>
            </h1>
            <p className="text-xs text-slate-400">
              Correlated commits linked to deployments and failure timelines.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : codeChanges.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center text-xs text-slate-500">
            No commits recorded for this project yet.
          </div>
        ) : (
          <div className="space-y-3">
            {codeChanges.map((commit) => (
              <div
                key={commit.id}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded">
                      {commit.commitSha?.substring(0, 7)}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {commit.branch || 'main'}
                    </Badge>
                    {commit.deployment && (
                      <Link href={`/projects/${projectId}/deployments/${commit.deployment.id}`}>
                        <Badge variant="default" className="text-[10px] gap-1 cursor-pointer hover:bg-indigo-600/30">
                          <Rocket className="h-2.5 w-2.5" />
                          <span>{commit.deployment.version}</span>
                        </Badge>
                      </Link>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatDate(commit.committedAt)}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-200 font-mono">
                  {commit.message}
                </p>

                {commit.filesChanged && (
                  <div className="text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800/80 font-mono">
                    {commit.filesChanged}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Author: <strong className="text-slate-400">{commit.author}</strong></span>
                  {commit.pullRequestUrl && (
                    <a
                      href={commit.pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>Pull Request</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
