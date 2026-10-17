'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

export function ThemeToggle({
  variant = 'segmented',
  className = '',
}: {
  variant?: 'segmented' | 'dropdown';
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Appearance Theme"
        className={`inline-flex items-center rounded-md border border-border bg-surface p-0.5 text-xs select-none ${className}`}
      >
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'light'}
          onClick={() => setTheme('light')}
          title="Light theme"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] transition-all font-medium text-xs ${
            theme === 'light'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-foreground-secondary hover:text-foreground hover:bg-background/40'
          } focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
        >
          <Sun className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>Light</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={theme === 'dark'}
          onClick={() => setTheme('dark')}
          title="Dark theme"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] transition-all font-medium text-xs ${
            theme === 'dark'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-foreground-secondary hover:text-foreground hover:bg-background/40'
          } focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
        >
          <Moon className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={theme === 'system'}
          onClick={() => setTheme('system')}
          title="System theme preference"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] transition-all font-medium text-xs ${
            theme === 'system'
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-foreground-secondary hover:text-foreground hover:bg-background/40'
          } focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
        >
          <Laptop className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />
          <span>System</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Appearance Theme"
        title={`Theme: ${theme}`}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground-secondary hover:text-foreground hover:bg-background-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {theme === 'light' ? (
          <Sun className="h-4 w-4 text-amber-500" />
        ) : theme === 'dark' ? (
          <Moon className="h-4 w-4 text-blue-400" />
        ) : (
          <Laptop className="h-4 w-4 text-foreground-muted" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-40 rounded-md border border-border bg-card p-1 shadow-md z-50 text-xs">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Theme
          </div>
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-[4px] transition-colors ${
              theme === 'light' ? 'bg-surface font-semibold text-foreground' : 'text-foreground-secondary hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>Light</span>
            </div>
            {theme === 'light' && <Check className="h-3 w-3 text-primary" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-[4px] transition-colors ${
              theme === 'dark' ? 'bg-surface font-semibold text-foreground' : 'text-foreground-secondary hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-blue-400" />
              <span>Dark</span>
            </div>
            {theme === 'dark' && <Check className="h-3 w-3 text-primary" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-[4px] transition-colors ${
              theme === 'system' ? 'bg-surface font-semibold text-foreground' : 'text-foreground-secondary hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5 text-foreground-muted" />
              <span>System</span>
            </div>
            {theme === 'system' && <Check className="h-3 w-3 text-primary" />}
          </button>
        </div>
      )}
    </div>
  );
}

