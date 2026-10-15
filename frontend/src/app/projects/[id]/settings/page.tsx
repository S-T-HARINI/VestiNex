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

  const loadData = async () => {
    try {
      const res = await api.getProject(projectId);
      if (res.project) {
        setProject(res.project);
        setName(res.project.name);
        setDescription(res.project.description || '');
        setRepoUrl(res.project.repoUrl || '');
        setEnvironment(res.project.environment);
        setMembers(res.project.members || []);
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
        <div className="border-b border-slate-800/80 pb-4">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-400" />
            <span>Project Settings & Governance</span>
          </h1>
          <p className="text-xs text-slate-400">
            Configure project parameters, environment scopes, and team RBAC permissions.
          </p>
        </div>

        {/* General Settings */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-white">General Configuration</CardTitle>
            <CardDescription className="text-xs">
              Basic metadata and primary operational environment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {saveSuccess && (
              <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Project configurations saved successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Project Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-950 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 h-20 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Repository URL</label>
                  <Input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="bg-slate-950 text-xs"
                    type="url"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Monitored Environment</label>
                  <select
                    value={environment}
                    onChange={(e: any) => setEnvironment(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="STAGING">STAGING</option>
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs">
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Team Members & RBAC */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-400" />
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
            <form onSubmit={handleAddMember} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2 text-xs">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
                <span>Add Team Member</span>
              </div>

              {memberError && (
                <div className="rounded border border-red-500/30 bg-red-950/20 p-2 text-[11px] text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{memberError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="engineer@vestinex.io (must be registered user)"
                  required
                  className="bg-slate-900 text-xs flex-1"
                />

                <select
                  value={newMemberRole}
                  onChange={(e: any) => setNewMemberRole(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>

                <Button type="submit" size="sm" disabled={addingMember || !newMemberEmail.trim()} className="bg-indigo-600 text-xs">
                  {addingMember ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </form>

            {/* Members List */}
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {m.user?.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-300">
                        {m.user?.name?.substring(0, 2).toUpperCase() || 'EM'}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-white">{m.user?.name || 'Unknown User'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.user?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {m.role === 'OWNER' ? (
                      <Badge variant="default" className="text-[10px]">OWNER</Badge>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
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
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
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

        {/* Danger Zone */}
        <Card className="border-red-900/40 bg-red-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Danger Zone</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Irreversible actions for this project scope.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xs text-slate-300">
              <div className="font-semibold">Archive Project</div>
              <div className="text-[11px] text-slate-400">
                Freeze all deployment monitoring and hide project from active dashboards.
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleArchive}
              className="text-xs bg-red-600/30 text-red-300 border border-red-500/40 hover:bg-red-600/50"
            >
              Archive Project
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
