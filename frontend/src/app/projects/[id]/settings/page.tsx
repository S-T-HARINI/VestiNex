'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import {
  Settings,
  Users,
  Shield,
  UserPlus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { refreshProjects } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit project state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [environment, setEnvironment] = useState<any>('PRODUCTION');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add member state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'DEVELOPER' | 'VIEWER'>('DEVELOPER');
  const [memberError, setMemberError] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [res, auditRes] = await Promise.all([
        api.getProject(projectId),
        api.getProjectAuditLogs(projectId).catch(() => ({ logs: [] })),
      ]);
      if (res.project) {
        setProject(res.project);
        setName(res.project.name);
        setDescription(res.project.description || '');
        setRepoUrl(res.project.repoUrl || '');
        setEnvironment(res.project.environment);
        setMembers(res.project.members || []);
      }
      if (auditRes?.logs) {
        setAuditLogs(auditRes.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    try {
      await api.updateProject(projectId, {
        name,
        description,
        repoUrl: repoUrl || null,
        environment,
      });
      setSaveSuccess(true);
      await refreshProjects();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setAddingMember(true);

    try {
      await api.addProjectMember(projectId, {
        email: newMemberEmail,
        role: newMemberRole,
      });
      setNewMemberEmail('');
      loadData();
    } catch (err: any) {
      setMemberError(err.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateProjectMemberRole(projectId, userId, newRole);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.removeProjectMember(projectId, userId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this project?')) return;
    try {
      await api.archiveProject(projectId);
      await refreshProjects();
      router.push('/projects');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-8">
        <div className="border-b border-border pb-4">
          <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent" />
            <span>Project Settings & Governance</span>
          </h1>
          <p className="text-xs text-foreground-secondary">
            Configure project parameters, environment scopes, and team RBAC permissions.
          </p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">General Configuration</CardTitle>
            <CardDescription className="text-xs">
              Basic metadata and primary operational environment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {saveSuccess && (
              <div className="mb-4 rounded-md border border-status-success/30 bg-status-success/10 p-2.5 text-xs text-status-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" />
                <span>Project configurations saved successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Project Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground h-20 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Repository URL</label>
                  <Input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="text-xs"
                    type="url"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Monitored Environment</label>
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

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="sm" className="text-xs">
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Team Members & RBAC */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span>Team Members & Role-Based Access</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage engineering access: Owner, Admin, Developer, or Viewer.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {members.length} Members
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Member Form */}
            <form onSubmit={handleAddMember} className="rounded-md border border-border bg-surface p-3 space-y-2 text-xs">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-accent" />
                <span>Add Team Member</span>
              </div>

              {memberError && (
                <div className="rounded border border-status-error/30 bg-status-error/10 p-2 text-[11px] text-status-error flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{memberError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  name="project_member_invite_email"
                  autoComplete="off"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="colleague@example.com (must be registered user)"
                  required
                  className="text-xs flex-1"
                />

                <select
                  value={newMemberRole}
                  onChange={(e: any) => setNewMemberRole(e.target.value)}
                  className="rounded border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>

                <Button type="submit" size="sm" disabled={addingMember || !newMemberEmail.trim()} className="text-xs">
                  {addingMember ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </form>

            {/* Members List */}
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-border bg-surface/50 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {m.user?.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-border text-[10px] font-bold flex items-center justify-center text-foreground">
                        {m.user?.name?.substring(0, 2).toUpperCase() || 'EM'}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-foreground">{m.user?.name || 'Unknown User'}</div>
                      <div className="text-[11px] text-foreground-secondary font-mono">{m.user?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {m.role === 'OWNER' ? (
                      <Badge variant="default" className="text-[10px]">OWNER</Badge>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                        className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="DEVELOPER">DEVELOPER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    )}

                    {m.role !== 'OWNER' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(m.userId)}
                        className="h-7 w-7 p-0 text-foreground-muted hover:text-status-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit Trail & Operational Security History */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Audit Trail & Operational History</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {auditLogs.length} Records
              </Badge>
            </div>
            <CardDescription className="text-xs text-foreground-secondary">
              Immutable forensic log of security-sensitive operations, membership events, and deployments within this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-foreground-muted border border-dashed border-border rounded-md">
                No audit events recorded for this workspace yet.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-80 overflow-y-auto pr-1">
                {auditLogs.slice(0, 20).map((log: any) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0">
                          {log.action}
                        </Badge>
                        <span className="font-medium text-foreground text-xs">
                          {log.user?.name || (log.userId ? log.userId : 'Automated / System')}
                        </span>
                        <span className="text-[10px] text-foreground-muted font-mono">
                          ({log.entityType}: {log.entityId?.substring(0, 12)})
                        </span>
                      </div>
                      {log.changes && (
                        <div className="text-[11px] text-foreground-secondary font-mono truncate max-w-xl">
                          {typeof log.changes === 'object' ? JSON.stringify(log.changes) : String(log.changes)}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-foreground-muted font-mono shrink-0 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-status-error/30 bg-status-error/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-status-error flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Danger Zone</span>
            </CardTitle>
            <CardDescription className="text-xs text-foreground-secondary">
              Irreversible actions for this project scope.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xs text-foreground">
              <div className="font-semibold">Archive Project</div>
              <div className="text-[11px] text-foreground-secondary">
                Freeze all deployment monitoring and hide project from active dashboards.
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleArchive}
              className="text-xs"
            >
              Archive Project
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
