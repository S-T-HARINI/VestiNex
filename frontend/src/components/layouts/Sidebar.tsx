'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  AlertOctagon,
  Rocket,
  GitBranch,
  History,
  Settings,
  Activity,
  ShieldCheck,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { activeProject } = useAuth();

  const projectId = activeProject?.id;

  const navItems = [
    {
      name: 'Overview',
      href: projectId ? `/projects/${projectId}` : '/dashboard',
      icon: LayoutDashboard,
      matchExact: true,
    },
    {
      name: 'Incident Workspace',
      href: projectId ? `/projects/${projectId}/incidents` : '/projects',
      icon: AlertOctagon,
      badge: activeProject?.incidentCount ? `${activeProject.incidentCount}` : undefined,
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    {
      name: 'Deployments',
      href: projectId ? `/projects/${projectId}/deployments` : '/projects',
      icon: Rocket,
      badge: activeProject?.deploymentCount ? `${activeProject.deploymentCount}` : undefined,
    },
    {
      name: 'Code Commits',
      href: projectId ? `/projects/${projectId}/code-changes` : '/projects',
      icon: GitBranch,
    },
    {
      name: 'Chronological Timeline',
      href: projectId ? `/projects/${projectId}/timeline` : '/projects',
      icon: History,
    },
    {
      name: 'Project Settings',
      href: projectId ? `/projects/${projectId}/settings` : '/projects',
      icon: Settings,
    },
  ];

  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-60 flex-col justify-between border-r border-slate-800/80 bg-slate-950/60 p-3 backdrop-blur-sm select-none">
      <div className="space-y-4">
        {/* Active Project Card */}
        {activeProject && (
          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active Scope
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-200 truncate">
              {activeProject.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time Event Ingestion</span>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.matchExact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded border px-1.5 py-0.2 text-[10px] font-mono ${
                      item.badgeColor || 'border-slate-700 bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer info: Telemetry & Platform health */}
      <div className="border-t border-slate-800/80 pt-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono text-[10px]">INGEST ENGINE</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
          <span>VestiNex Intelligence v1.0</span>
        </div>
      </div>
    </aside>
  );
}
