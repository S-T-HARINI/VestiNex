import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Radio, LogIn, UserPlus } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Global Minimal Header */}
      <header className="flex h-14 w-full items-center justify-between border-b border-border bg-background px-4 sm:px-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-primary text-primary-foreground font-mono font-bold text-xs shadow-xs">
            <Radio className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-base font-semibold tracking-tight font-mono leading-none">VestiNex</span>
            <span className="text-[8.5px] font-mono tracking-wider text-foreground-muted font-medium uppercase mt-0.5 leading-none">
              WHO BROKE THE BUILD?
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle variant="dropdown" />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs font-medium hover:-translate-y-[1px] hover:shadow-xs transition-all duration-200">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="text-xs font-medium hover:-translate-y-[1px] hover:shadow-sm transition-all duration-200">
              Create Account
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 max-w-3xl mx-auto text-center space-y-8">
        {/* Brand identity */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-mono text-foreground-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Incident Intelligence &amp; Deployment Monitoring</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono leading-none">
              VestiNex
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase font-mono text-primary pt-1">
              WHO BROKE THE BUILD?
            </p>
          </div>
          <p className="text-xs sm:text-sm font-medium text-foreground-secondary tracking-wide">
            Operational visibility and evidence-based incident investigations.
          </p>
        </div>

        {/* Clear Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link href="/login">
            <Button size="default" className="text-xs font-medium gap-2 px-5 h-9 hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 cursor-pointer">
              <LogIn className="h-3.5 w-3.5" />
              <span>Login</span>
            </Button>
          </Link>
          <Link href="/register">
            <Button size="default" variant="outline" className="text-xs font-medium gap-2 px-5 h-9 hover:-translate-y-[2px] hover:shadow-sm hover:border-foreground-muted transition-all duration-200 cursor-pointer">
              <UserPlus className="h-3.5 w-3.5 text-primary" />
              <span>Create Account</span>
            </Button>
          </Link>
        </div>

        {/* Short, Neatly Formatted About Section */}
        <section className="pt-6 border-t border-border/70 max-w-2xl text-left sm:text-center space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono">
            About VestiNex
          </h2>
          <p className="text-xs sm:text-sm text-foreground-secondary leading-relaxed max-w-xl mx-auto">
            VestiNex is an incident intelligence and deployment monitoring platform that helps engineering teams investigate production incidents, correlate deployments and code changes, reconstruct event timelines, and collaborate on resolution. It provides evidence-based investigation tools and operational visibility to support faster, more informed debugging.
          </p>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border py-4 px-4 text-center text-[11px] text-foreground-muted font-mono">
        <p>&copy; {new Date().getFullYear()} VestiNex. Engineered for reliability.</p>
      </footer>
    </div>
  );
}
