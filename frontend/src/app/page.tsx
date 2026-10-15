import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Radio,
  Clock,
  Rocket,
  GitBranch,
  ShieldAlert,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-200">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-md max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 shadow-lg shadow-indigo-500/20">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight font-mono">VestiNex</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400">
          <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
          <a href="#workspace" className="hover:text-slate-200 transition-colors">Investigation Workspace</a>
          <a href="#workflow" className="hover:text-slate-200 transition-colors">Methodology</a>
          <a href="#architecture" className="hover:text-slate-200 transition-colors">Architecture</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs text-slate-300">
              Sign In
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-500 gap-1.5 shadow-sm shadow-indigo-600/30">
              <span>Open Platform</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 max-w-7xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-mono text-indigo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span>Incident Intelligence & Deployment Monitoring</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Every failure <span className="text-indigo-400 underline decoration-indigo-500/40 underline-offset-8">leaves a trace.</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          When production degrades, guesswork begins. VestiNex unites deployments, Git commits, telemetry ingestion delays, and incident lifecycles into a single forensic timeline.
        </p>

        <div className="flex items-center justify-center gap-3 pt-4">
          <Link href="/login">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-sm font-medium gap-2 shadow-lg shadow-indigo-600/25">
              <span>Launch Live Investigation</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="border-slate-800 bg-slate-900/60 text-sm font-medium">
              Create Engineering Account
            </Button>
          </Link>
        </div>

        {/* Live System Preview / Workspace Teaser */}
        <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900/40 p-3 shadow-2xl backdrop-blur-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 px-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-slate-400">vestinex-investigation-workspace // prj_vestinex_core</span>
            </div>
            <Badge variant="delayed" className="text-[10px]">
              Active Incident: Elevated 502 Spike on /api/v2/settle
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 text-xs">
            {/* Visual Timeline mockup */}
            <div className="lg:col-span-2 space-y-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Chronological Event Reconstruction
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="rounded border border-indigo-500/30 bg-indigo-950/20 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-indigo-300">DEPLOYMENT: v2.4.1 (commit f82e14a)</span>
                  </div>
                  <span className="text-slate-400">09:28 UTC [Ingested +5s]</span>
                </div>

                <div className="rounded border border-red-500/40 bg-red-950/20 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-red-300 font-bold">INCIDENT ONSET: 14.8% HTTP 502 Settle Spike</span>
                  </div>
                  <span className="text-red-400 font-semibold">09:46 UTC [Telemetry Lag +2m 12s]</span>
                </div>

                <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">HOTFIX ROLLOUT: v2.4.2-hotfix (circuit-breaker)</span>
                  </div>
                  <span className="text-slate-400">11:54 UTC [RESOLVED]</span>
                </div>
              </div>
            </div>

            {/* Correlation lead card */}
            <div className="rounded border border-slate-800 bg-slate-950/80 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Evidence Correlation
                </span>
                <Badge variant="critical" className="text-[9px]">High Lead</Badge>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Deployment v2.4.1 finished 18 minutes prior to socket queue saturation. PR #194 reduced settlement batch window from 60s to 5s.
              </p>
              <div className="text-[10px] text-amber-400/90 italic pt-1">
                * Correlation provides investigative signal; causation verified via commit diff.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Breakdown Section */}
      <section id="features" className="py-16 px-6 max-w-7xl mx-auto border-t border-slate-800/80 space-y-12">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="font-mono text-xs">Core Capabilities</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Designed for Incident Commanders & SREs
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Standard metrics tell you that an alert fired. VestiNex tells you the chronological sequence that caused it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/15 border border-indigo-500/20 text-indigo-400">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Dual-Timestamp Reconstruction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Network buffers and log forwarders introduce telemetry lag. VestiNex tracks both true occurrence time and ingestion time, highlighting out-of-order logs that disguise causal chains.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600/15 border border-cyan-500/20 text-cyan-400">
                <Rocket className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Deployment Correlation Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically scans candidate deployments across environments within temporal investigation windows. Provides reasoned hypotheses without falsely claiming correlation proves causation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/15 border border-red-500/20 text-red-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Audit & Incident Collaboration</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Maintain immutable audit logs of status transitions, post-mortems, and technical hypotheses. Support assignments, runbook notes, and resolution documentation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Methodology Section */}
      <section id="workflow" className="py-16 px-6 max-w-7xl mx-auto border-t border-slate-800/80 space-y-12">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="font-mono text-xs">Failure Analysis</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How Engineering Teams Investigate Outages
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <div className="font-mono text-indigo-400 font-bold">01 // DETECTION</div>
            <h4 className="font-semibold text-white">Alert Trigger</h4>
            <p className="text-slate-400 leading-relaxed">
              An alert fires on latency or errors. VestiNex registers the incident with severity and ingest timestamp.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <div className="font-mono text-indigo-400 font-bold">02 // CORRELATION</div>
            <h4 className="font-semibold text-white">Temporal Scan</h4>
            <p className="text-slate-400 leading-relaxed">
              VestiNex queries recent deployments and commit SHAs in the target environment, calculating temporal proximity scores.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <div className="font-mono text-indigo-400 font-bold">03 // FORENSICS</div>
            <h4 className="font-semibold text-white">Diff Verification</h4>
            <p className="text-slate-400 leading-relaxed">
              Engineers inspect code diffs, commit authors, and out-of-order telemetry logs in the unified investigation workspace.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <div className="font-mono text-indigo-400 font-bold">04 // RESOLUTION</div>
            <h4 className="font-semibold text-white">Hotfix & Audit</h4>
            <p className="text-slate-400 leading-relaxed">
              Hotfix or rollback deployment is linked. Incident transitions to RESOLVED with full post-mortem audit records.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center border-t border-slate-800/80 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Stop guessing why production broke.
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Deploy VestiNex to reconstruct your system events with forensic accuracy.
        </p>
        <div>
          <Link href="/login">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 font-medium px-8 text-sm">
              Open Live Platform Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-6 text-xs text-slate-500 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-indigo-400" />
          <span className="font-semibold text-slate-300">VestiNex</span>
          <span>— Incident Intelligence & Deployment Monitoring</span>
        </div>
        <div>
          <span>Repository: </span>
          <a
            href="https://github.com/S-T-HARINI/VestiNex.git"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:underline font-mono"
          >
            github.com/S-T-HARINI/VestiNex
          </a>
        </div>
      </footer>
    </div>
  );
}
