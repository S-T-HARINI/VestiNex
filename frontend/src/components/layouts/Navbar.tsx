'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Layers,
  ChevronDown,
  LogOut,
  Plus,
  AlertTriangle,
  GitCommit,
  Radio,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export function Navbar({ onToggleMobileSidebar, isMobileSidebarOpen }: NavbarProps) {
  const { user, projects, activeProject, setActiveProject, logout } = useAuth();
  const router = useRouter();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectMenuOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-12 w-full items-center justify-between border-b border-border bg-background px-3 sm:px-4">
      {/* Left: Mobile hamburger, Brand & Project Selector */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation"
            className="md:hidden flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-foreground-secondary hover:text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        )}

        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-foreground font-semibold tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-primary text-primary-foreground font-mono font-bold text-xs">
            <Radio className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight font-mono">VestiNex</span>
        </Link>

        <div className="h-3.5 w-px bg-border hidden sm:block" />

        {/* Project Selector Dropdown */}
        <div className="relative" ref={projectDropdownRef}>
          <button
            type="button"
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className="flex items-center gap-1.5 rounded-[5px] border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:border-foreground-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Layers className="h-3 w-3 text-primary" />
            <span className="max-w-[120px] sm:max-w-[180px] truncate">
              {activeProject?.name || 'Select Project'}
            </span>
            <ChevronDown className="h-3 w-3 text-foreground-muted" />
          </button>

          {projectMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-md border border-border bg-card p-1 shadow-lg z-50 text-xs">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                Monitored Projects ({projects.length})
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveProject(p);
                      setProjectMenuOpen(false);
                      router.push(`/projects/${p.id}`);
                    }}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${
                      activeProject?.id === p.id
                        ? 'bg-surface text-foreground font-medium'
                        : 'text-foreground-secondary hover:bg-surface hover:text-foreground'
                    }`}
                  >
                    <span className="truncate pr-2">{p.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                      {p.environment}
                    </Badge>
                  </button>
                ))}
              </div>

              <div className="my-1 h-px bg-border" />
              <Link
                href="/projects/new"
                onClick={() => setProjectMenuOpen(false)}
                className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-primary hover:bg-surface font-medium transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Initialize New Project</span>
              </Link>
            </div>
          )}
        </div>

        {activeProject && (
          <Badge
            variant={
              activeProject.environment === 'PRODUCTION'
                ? 'critical'
                : activeProject.environment === 'STAGING'
                ? 'high'
                : 'outline'
            }
            className="hidden lg:inline-flex text-[10px] uppercase font-mono"
          >
            {activeProject.environment}
          </Badge>
        )}
      </div>

      {/* Right: Quick actions, Theme Toggle & User menu */}
      <div className="flex items-center gap-2">
        {activeProject && (
          <div className="hidden sm:flex items-center gap-1.5">
            <Link href={`/projects/${activeProject.id}/incidents/new`}>
              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1 px-2.5">
                <AlertTriangle className="h-3 w-3" />
                <span>Report Incident</span>
              </Button>
            </Link>

            <Link href={`/projects/${activeProject.id}/deployments/new`}>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2.5">
                <GitCommit className="h-3 w-3 text-primary" />
                <span>Record Deploy</span>
              </Button>
            </Link>
          </div>
        )}

        <div className="h-3.5 w-px bg-border hidden sm:block" />

        {/* Visible Segmented Theme Toggle */}
        <div className="hidden sm:flex items-center">
          <ThemeToggle variant="segmented" />
        </div>
        <div className="sm:hidden flex items-center">
          <ThemeToggle variant="dropdown" />
        </div>

        {/* User Menu Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="User account menu"
            className="flex items-center gap-1.5 rounded-full border border-border p-0.5 hover:border-foreground-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div
                role="img"
                aria-label={user?.name || 'User avatar'}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-foreground"
              >
                {user?.name?.substring(0, 2).toUpperCase() || 'VN'}
              </div>
            )}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-60 rounded-md border border-border bg-card p-1 shadow-lg z-50 text-xs">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-xs font-semibold text-foreground truncate">{user?.name}</div>
                <div className="text-[11px] text-foreground-secondary truncate">{user?.email}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] py-0 font-mono uppercase">
                    {user?.role}
                  </Badge>
                </div>
              </div>

              {/* Explicit Appearance in dropdown for quick mobile/tablet access */}
              <div className="px-3 py-2 border-b border-border space-y-1.5">
                <div className="text-[10px] uppercase font-semibold text-foreground-muted tracking-wider">Appearance</div>
                <ThemeToggle variant="segmented" className="w-full justify-between" />
              </div>

              <div className="py-1">
                <Link
                  href="/projects"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
                >
                  <span>All Projects</span>
                  <ExternalLink className="h-3 w-3 text-foreground-muted" />
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
                >
                  <span>Global Overview</span>
                </Link>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-status-error hover:bg-status-error/10 transition-colors"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
