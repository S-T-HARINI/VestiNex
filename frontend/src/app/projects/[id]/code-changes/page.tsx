'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/ui/copy-button';
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-accent" />
              <span>Git Commits & Code Changes</span>
            </h1>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Correlated commits linked to deployments and failure timelines.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {project?.repoUrl ? (
              <Button
                onClick={handleSync}
                disabled={syncing}
                size="sm"
                className="flex items-center gap-2 text-xs font-medium transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Importing Commits...' : 'Sync GitHub Commits'}</span>
              </Button>
            ) : (
              <Link href={`/projects/${projectId}/settings`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-status-warning border-status-warning/40 hover:bg-status-warning/10 flex items-center gap-1.5"
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
            className={`flex items-start justify-between p-3 rounded-md border text-xs ${
              feedback.type === 'success'
                ? 'bg-status-success/10 border-status-success/30 text-status-success'
                : feedback.type === 'error'
                ? 'bg-status-error/10 border-status-error/30 text-status-error'
                : 'bg-surface border-border text-foreground-secondary'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-status-error" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-foreground-muted hover:text-foreground ml-4 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </div>
        ) : codeChanges.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-12 text-center space-y-3">
            <GitCommit className="h-8 w-8 text-foreground-muted mx-auto" />
            <div className="text-sm font-medium text-foreground">No commits recorded for this project yet.</div>
            {project?.repoUrl ? (
              <div className="space-y-3">
                <p className="text-xs text-foreground-secondary max-w-md mx-auto">
                  Connected repository: <code className="text-accent font-mono">{project.repoUrl}</code>. Click below to fetch and display the real commit history.
                </p>
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  size="sm"
                  className="inline-flex items-center gap-2 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Importing...' : 'Sync Commits from GitHub'}</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-foreground-secondary max-w-md mx-auto">
                  To view real commit history and correlate deployments with code changes, connect a public GitHub repository in project settings.
                </p>
                <Link href={`/projects/${projectId}/settings`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Configure Repository URL
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {codeChanges.map((commit) => {
              const commitUrl =
                commit.pullRequestUrl ||
                (commit.repoUrl ? `${commit.repoUrl.replace(/\.git$/, '')}/commit/${commit.commitSha}` : null);

              return (
                <div
                  key={commit.id}
                  className="rounded-md border border-border bg-card p-4 space-y-2 hover:border-border-hover transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        {commitUrl ? (
                          <a
                            href={commitUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded hover:bg-accent/20 hover:underline flex items-center gap-1"
                          >
                            <span>{commit.commitSha?.substring(0, 7)}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                            {commit.commitSha?.substring(0, 7)}
                          </span>
                        )}
                        <CopyButton text={commit.commitSha} />
                      </div>

                      <Badge variant="outline" className="text-[10px] font-mono">
                        {commit.branch || 'main'}
                      </Badge>
                      {commit.deployment && (
                        <Link href={`/projects/${projectId}/deployments/${commit.deployment.id}`}>
                          <Badge variant="default" className="text-[10px] gap-1 cursor-pointer">
                            <Rocket className="h-2.5 w-2.5" />
                            <span>{commit.deployment.version}</span>
                          </Badge>
                        </Link>
                      )}
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-foreground-muted">
                      {formatDate(commit.committedAt)}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-foreground font-mono whitespace-pre-wrap break-words">
                    {commit.message}
                  </p>

                  {commit.filesChanged && (
                    <div className="text-[11px] text-foreground-secondary bg-surface p-2 rounded border border-border font-mono">
                      {commit.filesChanged}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-foreground-muted pt-1">
                    <span>
                      Author: <strong className="text-foreground-secondary">{commit.author}</strong>
                    </span>
                    {commitUrl && (
                      <a
                        href={commitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline flex items-center gap-1 font-mono"
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
