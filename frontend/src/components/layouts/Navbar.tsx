'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Layers,
  ChevronDown,
  LogOut,
  Plus,
  AlertTriangle,
  GitCommit,
  Radio,
  ExternalLink,
} from 'lucide-react';

export function Navbar() {
  const { user, projects, activeProject, setActiveProject, logout } = useAuth();
  const router = useRouter();
  const [projectMenuOpen, setProjectMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 backdrop-blur-md">
      {/* Left: Brand & Project Selector */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-white font-bold tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 shadow-sm shadow-indigo-500/20">
            <Radio className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold tracking-wider font-mono">VestiNex</span>
        </Link>

        <div className="h-4 w-px bg-slate-800" />

        {/* Project Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-slate-700 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span className="max-w-[160px] truncate">{activeProject?.name || 'Select Project'}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {projectMenuOpen && (
            <div className="absolute left-0 mt-2 w-64 rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl z-50">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Active Projects ({projects.length})
              </div>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p);
                    setProjectMenuOpen(false);
                    router.push(`/projects/${p.id}`);
                  }}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${
                    activeProject?.id === p.id
                      ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {p.environment}
                  </Badge>
                </button>
              ))}
              <div className="my-1 h-px bg-slate-800" />
              <Link
                href="/projects/new"
                onClick={() => setProjectMenuOpen(false)}
                className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-indigo-400 hover:bg-slate-800"
              >
                <Plus className="h-3 w-3" />
                <span>Create New Project</span>
              </Link>
            </div>
          )}
        </div>

        {activeProject && (
          <Badge
            variant={
              activeProject.environment === 'PRODUCTION'
                ? 'destructive'
                : activeProject.environment === 'STAGING'
                ? 'medium'
                : 'outline'
            }
            className="text-[10px] font-mono tracking-wider"
          >
            {activeProject.environment}
          </Badge>
        )}
      </div>

      {/* Right: Quick actions & User menu */}
      <div className="flex items-center gap-3">
        {activeProject && (
          <>
            <Link href={`/projects/${activeProject.id}/incidents/new`}>
              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5 bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30">
                <AlertTriangle className="h-3 w-3" />
                <span>Report Incident</span>
              </Button>
            </Link>

            <Link href={`/projects/${activeProject.id}/deployments/new`}>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-slate-700 bg-slate-900 text-slate-200">
                <GitCommit className="h-3 w-3 text-cyan-400" />
                <span>New Deploy</span>
              </Button>
            </Link>
          </>
        )}

        <div className="h-4 w-px bg-slate-800" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-full border border-slate-800 p-0.5 hover:border-slate-700 transition-colors"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                {user?.name?.substring(0, 2).toUpperCase() || 'VN'}
              </div>
            )}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-slate-800/80">
                <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                <Badge variant="outline" className="mt-1 text-[9px] py-0">
                  {user?.role}
                </Badge>
              </div>

              <Link
                href="/projects"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                <span>All Projects</span>
                <ExternalLink className="h-3 w-3 text-slate-500" />
              </Link>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-red-400 hover:bg-slate-800"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
