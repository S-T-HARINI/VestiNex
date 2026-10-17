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
  FolderGit2,
  Radio,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
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
      badgeColor: 'border-status-error-border bg-status-error-bg text-status-error',
    },
    {
      name: 'Deployments',
      href: projectId ? `/projects/${projectId}/deployments` : '/projects',
      icon: Rocket,
      badge: activeProject?.deploymentCount ? `${activeProject.deploymentCount}` : undefined,
      badgeColor: 'border-border bg-surface text-foreground-secondary',
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

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-2.5">
      <div className="space-y-3">
        {/* Project Scope Indicator */}
        {activeProject ? (
          <div className="rounded-[6px] border border-border bg-surface/50 p-2 text-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Active Scope
            </div>
            <div className="mt-0.5 text-xs font-semibold text-foreground truncate">
              {activeProject.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-foreground-secondary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-success shrink-0" />
              <span className="truncate">Telemetry Stream Active</span>
            </div>
          </div>
        ) : (
          <Link
            href="/projects"
            onClick={onCloseMobile}
            className="flex items-center gap-2 rounded-[6px] border border-dashed border-border p-2 text-xs text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
          >
            <FolderGit2 className="h-3.5 w-3.5 text-foreground-muted" />
            <span>Select or Create Project</span>
          </Link>
        )}

        {/* Navigation links */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.matchExact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center justify-between rounded-[5px] px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-surface text-foreground font-semibold border border-border/80'
                    : 'text-foreground-secondary hover:bg-surface hover:text-foreground border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-3.5 w-3.5 transition-colors ${
                      isActive ? 'text-primary' : 'text-foreground-muted group-hover:text-foreground'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-[3px] border px-1.5 py-0.2 text-[10px] font-mono font-medium ${
                      item.badgeColor || 'border-border bg-surface text-foreground-secondary'
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

      {/* Footer: Appearance Theme & Status Indicator */}
      <div className="border-t border-border pt-2.5 space-y-2">
        <div className="space-y-1 px-1">
          <div className="text-[10px] uppercase font-semibold text-foreground-muted tracking-wider">Appearance</div>
          <ThemeToggle variant="segmented" className="w-full justify-between" />
        </div>
        <div className="flex items-center justify-between text-[10px] text-foreground-muted px-1 font-mono pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-status-success" />
            <span>SYSTEM</span>
          </div>
          <span className="text-status-success font-semibold">ONLINE</span>
        </div>
        <div className="text-[10px] text-foreground-muted px-1">
          VestiNex Platform v1.0
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-background-secondary shrink-0 h-[calc(100vh-3rem)] sticky top-12 select-none">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-background/80"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative flex flex-col w-64 max-w-[80vw] bg-background-secondary border-r border-border h-full z-50 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
