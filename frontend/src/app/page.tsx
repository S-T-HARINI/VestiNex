import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Radio,
  Clock,
  Rocket,
  ArrowRight,
  ShieldAlert,
  GitBranch,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-primary text-primary-foreground font-mono font-bold text-xs">
            <Radio className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight font-mono">VestiNex</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs text-foreground-secondary font-medium">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#methodology" className="hover:text-foreground transition-colors">Investigation Methodology</a>
          <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle variant="dropdown" />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs">
              Sign In
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="text-xs gap-1.5 font-medium">
              <span>Open Platform</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-mono text-foreground-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Incident Intelligence & Deployment Monitoring</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
          Every failure <span className="text-primary underline decoration-primary/30 underline-offset-8">leaves a trace.</span>
        </h1>

        <p className="text-xs sm:text-sm text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
          When production degrades, guesswork begins. VestiNex unites deployments, Git commits, telemetry ingestion delays, and incident lifecycles into a unified forensic timeline.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <Link href="/login">
            <Button size="lg" className="text-xs font-medium gap-2">
              <span>Launch Live Investigation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="text-xs font-medium">
              Create Engineering Account
            </Button>
          </Link>
        </div>

        {/* Live System Preview / Workspace Teaser */}
        <div className="mt-10 rounded-lg border border-border bg-card text-left overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-surface/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-status-error" />
              <span className="h-2 w-2 rounded-full bg-status-warning" />
              <span className="h-2 w-2 rounded-full bg-status-success" />
              <span className="ml-2 font-mono text-[11px] text-foreground-secondary">
                vestinex-investigation-workspace // checkout-payment-engine
              </span>
            </div>
            <Badge variant="critical" className="text-[10px]">
              Active Incident: Elevated 502 Spike on /api/v2/settle
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 text-xs">
            {/* Visual Timeline mockup */}
            <div className="lg:col-span-2 space-y-2.5">
              <div className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider font-mono">
                Chronological Event Reconstruction
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="rounded border border-border bg-surface p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-3.5 w-3.5 text-primary" />
                    <span className="text-foreground font-medium">DEPLOYMENT: v2.4.1 (commit f82e14a)</span>
                  </div>
                  <span className="text-foreground-muted text-[10px]">09:28 UTC [Ingested +5s]</span>
                </div>

                <div className="rounded border border-status-error-border bg-status-error-bg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-status-error" />
                    <span className="text-status-error font-semibold">INCIDENT ONSET: 14.8% HTTP 502 Settle Spike</span>
                  </div>
                  <span className="text-status-error text-[10px] font-mono">09:46 UTC [Telemetry Lag +2m 12s]</span>
                </div>

                <div className="rounded border border-status-success-border bg-status-success-bg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
                    <span className="text-status-success font-medium">HOTFIX ROLLOUT: v2.4.2-hotfix (circuit-breaker)</span>
                  </div>
                  <span className="text-status-success text-[10px]">11:54 UTC [RESOLVED]</span>
                </div>
              </div>
            </div>

            {/* Evidence correlation card */}
            <div className="rounded border border-border bg-surface/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Evidence Correlation
                </span>
                <Badge variant="critical" className="text-[9px]">High Lead</Badge>
              </div>
              <p className="text-[11px] text-foreground-secondary leading-relaxed">
                Deployment v2.4.1 finished 18 minutes prior to socket queue saturation. PR #194 reduced settlement batch window from 60s to 5s.
              </p>
              <div className="text-[10px] text-foreground-muted italic pt-1 border-t border-border mt-2">
                * Correlation provides investigative signal; causation verified via commit diff.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Breakdown Section */}
      <section id="features" className="py-14 px-4 sm:px-6 max-w-7xl mx-auto border-t border-border space-y-10">
        <div className="text-center space-y-1.5">
          <Badge variant="outline" className="font-mono text-xs">Core Capabilities</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Designed for Incident Commanders & SREs
          </h2>
          <p className="text-xs sm:text-sm text-foreground-secondary max-w-xl mx-auto">
            Standard metrics tell you that an alert fired. VestiNex tells you the chronological sequence that caused it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-border bg-card">
            <CardContent className="p-5 space-y-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-surface text-primary border border-border">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Dual-Timestamp Reconstruction</h3>
              <p className="text-xs text-foreground-secondary leading-relaxed">
                Network buffers and log forwarders introduce telemetry lag. VestiNex tracks both true occurrence time and ingestion time, highlighting out-of-order logs that disguise causal chains.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardContent className="p-5 space-y-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-surface text-primary border border-border">
                <Rocket className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Deployment Correlation Engine</h3>
              <p className="text-xs text-foreground-secondary leading-relaxed">
                Automatically scans candidate deployments across environments within temporal investigation windows. Provides reasoned hypotheses without falsely claiming correlation proves causation.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardContent className="p-5 space-y-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-surface text-primary border border-border">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Audit & Incident Collaboration</h3>
              <p className="text-xs text-foreground-secondary leading-relaxed">
                Maintain immutable audit logs of status transitions, post-mortems, and technical hypotheses. Support assignments, runbook notes, and resolution documentation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Methodology Section */}
      <section id="methodology" className="py-14 px-4 sm:px-6 max-w-7xl mx-auto border-t border-border space-y-10">
        <div className="text-center space-y-1.5">
          <Badge variant="outline" className="font-mono text-xs">Failure Analysis</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            How Engineering Teams Investigate Outages
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="rounded-[6px] border border-border bg-card p-4 space-y-1.5">
            <div className="font-mono text-primary font-bold text-[11px]">01 // DETECTION</div>
            <h4 className="font-semibold text-foreground">Alert Trigger</h4>
            <p className="text-foreground-secondary leading-relaxed">
              An alert fires on latency or errors. VestiNex registers the incident with severity and ingest timestamp.
            </p>
          </div>

          <div className="rounded-[6px] border border-border bg-card p-4 space-y-1.5">
            <div className="font-mono text-primary font-bold text-[11px]">02 // CORRELATION</div>
            <h4 className="font-semibold text-foreground">Temporal Scan</h4>
            <p className="text-foreground-secondary leading-relaxed">
              VestiNex queries recent deployments and commit SHAs in the target environment, calculating temporal proximity scores.
            </p>
          </div>

          <div className="rounded-[6px] border border-border bg-card p-4 space-y-1.5">
            <div className="font-mono text-primary font-bold text-[11px]">03 // FORENSICS</div>
            <h4 className="font-semibold text-foreground">Diff Verification</h4>
            <p className="text-foreground-secondary leading-relaxed">
              Engineers inspect code diffs, commit authors, and out-of-order telemetry logs in the unified investigation workspace.
            </p>
          </div>

          <div className="rounded-[6px] border border-border bg-card p-4 space-y-1.5">
            <div className="font-mono text-primary font-bold text-[11px]">04 // RESOLUTION</div>
            <h4 className="font-semibold text-foreground">Hotfix & Audit</h4>
            <p className="text-foreground-secondary leading-relaxed">
              Hotfix or rollback deployment is linked. Incident transitions to RESOLVED with full post-mortem audit records.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto text-center border-t border-border space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          Stop guessing why production broke.
        </h2>
        <p className="text-xs sm:text-sm text-foreground-secondary max-w-md mx-auto">
          Deploy VestiNex to reconstruct your system events with forensic accuracy.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button size="lg" className="font-medium px-6 text-xs">
              Open Live Platform Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4 sm:px-6 text-xs text-foreground-muted max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">VestiNex</span>
          <span>— Incident Intelligence & Deployment Monitoring</span>
        </div>
        <div>
          <span>Repository: </span>
          <a
            href="https://github.com/S-T-HARINI/VestiNex.git"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-mono"
          >
            github.com/S-T-HARINI/VestiNex
          </a>
        </div>
      </footer>
    </div>
  );
}
