'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
  Compass,
  LayoutDashboard,
  AlertOctagon,
  Rocket,
  GitBranch,
  History,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export function Navbar({ onToggleMobileSidebar, isMobileSidebarOpen }: NavbarProps) {
  const { user, projects, activeProject, setActiveProject, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);

  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const jumpDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectMenuOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (jumpDropdownRef.current && !jumpDropdownRef.current.contains(event.target as Node)) {
        setJumpMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const projectId = activeProject?.id;
  const isViewer = activeProject?.role === 'VIEWER';

  const jumpSections = projectId
    ? [
        {
          name: 'Overview',
          href: `/projects/${projectId}`,
          icon: LayoutDashboard,
          exact: true,
        },
        {
          name: 'Incident Workspace',
          href: `/projects/${projectId}/incidents`,
          icon: AlertOctagon,
          exact: false,
        },
        {
          name: 'Deployments',
          href: `/projects/${projectId}/deployments`,
          icon: Rocket,
          exact: false,
        },
        {
          name: 'Code Commits',
          href: `/projects/${projectId}/code-changes`,
          icon: GitBranch,
          exact: false,
        },
        {
          name: 'Chronological Timeline',
          href: `/projects/${projectId}/timeline`,
          icon: History,
          exact: false,
        },
        {
          name: 'Project Settings',
          href: `/projects/${projectId}/settings`,
          icon: Settings,
          exact: false,
          disabled: isViewer,
          note: isViewer ? 'Admin only' : undefined,
        },
      ]
    : [];

  const currentSection = jumpSections.find((s) =>
    s.exact ? pathname === s.href : pathname.startsWith(s.href)
  );

  return (
    <header className="sticky top-0 z-40 flex h-12 w-full items-center justify-between border-b border-border bg-background px-3 sm:px-4">
      {/* Left: Mobile hamburger, Brand, Project Selector & Jump Menu */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation"
            className="md:hidden flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-foreground-secondary hover:text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          >
            {isMobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        )}

        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-foreground font-semibold tracking-tight hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-primary text-primary-foreground font-mono font-bold text-xs shrink-0 shadow-xs">
            <Radio className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold tracking-tight font-mono leading-none">VestiNex</span>
            <span className="text-[8.5px] font-mono tracking-wider text-foreground-muted font-medium uppercase mt-0.5 leading-none hidden xs:inline">
              WHO BROKE THE BUILD?
            </span>
          </div>
        </Link>

        <div className="h-3.5 w-px bg-border hidden sm:block" />

        {/* Project Selector Dropdown */}
        <div className="relative" ref={projectDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setProjectMenuOpen(!projectMenuOpen);
              setJumpMenuOpen(false);
            }}
            aria-label="Select project"
            aria-haspopup="true"
            aria-expanded={projectMenuOpen}
            className="flex items-center gap-1.5 rounded-[5px] border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground hover:border-foreground-muted/70 hover:-translate-y-[1px] transition-all duration-200 motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <Layers className="h-3 w-3 text-primary shrink-0" />
            <span className="max-w-[100px] sm:max-w-[160px] truncate">
              {activeProject?.name || 'Select Project'}
            </span>
            <ChevronDown className="h-3 w-3 text-foreground-muted shrink-0" />
          </button>

          {projectMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-md border border-border bg-card p-1 shadow-lg z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-100">
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

        {/* Top Navigation Jump Menu */}
        {activeProject && (
          <div className="relative" ref={jumpDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setJumpMenuOpen(!jumpMenuOpen);
                setProjectMenuOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setJumpMenuOpen(false);
              }}
              aria-label="Jump to section"
              aria-haspopup="menu"
              aria-expanded={jumpMenuOpen}
              className="flex items-center gap-1.5 rounded-[5px] border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground-secondary hover:text-foreground hover:border-foreground-muted/70 hover:-translate-y-[1px] transition-all duration-200 motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <Compass className="h-3 w-3 text-primary shrink-0" />
              <span className="hidden md:inline max-w-[130px] truncate">
                {currentSection ? currentSection.name : 'Jump to...'}
              </span>
              <span className="md:hidden">Jump</span>
              <ChevronDown className="h-3 w-3 text-foreground-muted shrink-0" />
            </button>

            {jumpMenuOpen && (
              <div
                role="menu"
                aria-label="Jump navigation destinations"
                className="absolute left-0 mt-1.5 w-56 rounded-md border border-border bg-card p-1 shadow-lg z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-100"
              >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Jump to Section
                </div>
                <div className="space-y-0.5">
                  {jumpSections.map((sec) => {
                    const Icon = sec.icon;
                    const isActive = sec.exact
                      ? pathname === sec.href
                      : pathname.startsWith(sec.href);

                    if (sec.disabled) {
                      return (
                        <div
                          key={sec.name}
                          className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-foreground-muted cursor-not-allowed opacity-60"
                          title="Administrator access required"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-foreground-muted" />
                            <span>{sec.name}</span>
                          </div>
                          <span className="text-[9px] uppercase font-mono">{sec.note}</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={sec.name}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setJumpMenuOpen(false);
                          router.push(sec.href);
                        }}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-surface text-foreground font-medium'
                            : 'text-foreground-secondary hover:bg-surface hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`h-3.5 w-3.5 ${
                              isActive ? 'text-primary' : 'text-foreground-muted'
                            }`}
                          />
                          <span>{sec.name}</span>
                        </div>
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeProject && (
          <Badge
            variant={
              activeProject.environment === 'PRODUCTION'
                ? 'critical'
                : activeProject.environment === 'STAGING'
                ? 'high'
                : 'outline'
            }
            className="hidden xl:inline-flex text-[10px] uppercase font-mono"
          >
            {activeProject.environment}
          </Badge>
        )}
      </div>

      {/* Right: Quick actions, Theme Toggle & User menu */}
      <div className="flex items-center gap-2">
        {activeProject && (
          <div className="flex items-center gap-1.5">
            <Link href={`/projects/${activeProject.id}/incidents/new`}>
              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1 px-2 sm:px-2.5">
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden sm:inline">Report Incident</span>
                <span className="sm:hidden">Incident</span>
              </Button>
            </Link>

            <Link href={`/projects/${activeProject.id}/deployments/new`}>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2 sm:px-2.5">
                <GitCommit className="h-3 w-3 text-primary" />
                <span className="hidden sm:inline">Record Deploy</span>
                <span className="sm:hidden">Deploy</span>
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
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setJumpMenuOpen(false);
              setProjectMenuOpen(false);
            }}
            aria-label="User account menu"
            className="flex items-center gap-1.5 rounded-full border border-border p-0.5 hover:border-foreground-muted/70 hover:-translate-y-[1px] transition-all duration-200 motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
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
            <div className="absolute right-0 mt-1.5 w-60 rounded-md border border-border bg-card p-1 shadow-lg z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-100">
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
                <div className="text-[10px] uppercase font-semibold text-foreground-muted tracking-wider">
                  Appearance
                </div>
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
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-status-error hover:bg-status-error-bg hover:text-status-error-text transition-colors cursor-pointer"
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
