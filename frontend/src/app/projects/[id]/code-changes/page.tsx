'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import {
  GitBranch,
  GitCommit,
  Rocket,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
} from 'lucide-react';

export default function CodeChangesPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [codeChanges, setCodeChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const loadData = async () => {
    try {
      const [projRes, commitsRes] = await Promise.all([
        api.getProject(projectId).catch(() => null),
        api.getCodeChanges(projectId).catch(() => null),
      ]);
      if (projRes?.project) setProject(projRes.project);
      if (commitsRes?.codeChanges) setCodeChanges(commitsRes.codeChanges);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const handleSync = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await api.syncCodeChanges(projectId);
      if (res.codeChanges) {
        setCodeChanges(res.codeChanges);
      } else {
        await loadData();
      }
      setFeedback({
        type: 'success',
        text: res.message || `Successfully synced commits from GitHub.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to sync commits from GitHub.',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-indigo-400" />
              <span>Git Commits & Code Changes</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Correlated commits linked to deployments and failure timelines.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {project?.repoUrl ? (
              <Button
                onClick={handleSync}
                disabled={syncing}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 text-xs font-medium shadow-sm transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Importing Commits...' : 'Sync GitHub Commits'}</span>
              </Button>
            ) : (
              <Link href={`/projects/${projectId}/settings`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-950/20 flex items-center gap-1.5"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Configure GitHub Repo URL</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {feedback && (
          <div
            className={`flex items-start justify-between p-3 rounded-lg border text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-200 ml-4 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : codeChanges.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center space-y-3">
            <GitCommit className="h-8 w-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-300">No commits recorded for this project yet.</div>
            {project?.repoUrl ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Connected repository: <code className="text-indigo-400 font-mono">{project.repoUrl}</code>. Click below to fetch and display the real commit history.
                </p>
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-2 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Importing...' : 'Sync Commits from GitHub'}</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  To view real commit history and correlate deployments with code changes, connect a public GitHub repository in project settings.
                </p>
                <Link href={`/projects/${projectId}/settings`}>
                  <Button variant="outline" size="sm" className="text-xs border-slate-700 hover:bg-slate-800">
                    Configure Repository URL
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {codeChanges.map((commit) => {
              const commitUrl =
                commit.pullRequestUrl ||
                (commit.repoUrl ? `${commit.repoUrl.replace(/\.git$/, '')}/commit/${commit.commitSha}` : null);

              return (
                <div
                  key={commit.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {commitUrl ? (
                        <a
                          href={commitUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded hover:bg-indigo-900/50 hover:underline flex items-center gap-1"
                        >
                          <span>{commit.commitSha?.substring(0, 7)}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                        </a>
                      ) : (
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded">
                          {commit.commitSha?.substring(0, 7)}
                        </span>
                      )}

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

                  <p className="text-xs font-medium text-slate-200 font-mono whitespace-pre-wrap break-words">
                    {commit.message}
                  </p>

                  {commit.filesChanged && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800/80 font-mono">
                      {commit.filesChanged}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>
                      Author: <strong className="text-slate-400">{commit.author}</strong>
                    </span>
                    {commitUrl && (
                      <a
                        href={commitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <span>
                          {commitUrl.includes('/commit/') ? 'View on GitHub' : 'Pull Request'}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
