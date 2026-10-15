'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatTimeRelative } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertOctagon,
  Clock,
  GitCommit,
  Rocket,
  MessageSquare,
  Link2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Send,
  Sparkles,
  Info,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  incident: any;
  onRefresh: () => void;
  users: any[];
}

export function InvestigationWorkspace({ incident, onRefresh, users }: Props) {
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState<string>('');
  const [transitionNote, setTransitionNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [linkingDeploymentId, setLinkingDeploymentId] = useState<string | null>(null);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      await api.addComment(incident.id, commentText);
      setCommentText('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!transitionStatus) return;
    try {
      await api.updateIncidentStatus(incident.id, transitionStatus, transitionNote, resolutionNote);
      setShowStatusModal(false);
      setTransitionNote('');
      setResolutionNote('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkDeployment = async (depId: string, confidence: string, note?: string) => {
    try {
      await api.linkDeployment(incident.id, depId, confidence, note);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlinkDeployment = async (depId: string) => {
    try {
      await api.unlinkDeployment(incident.id, depId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    try {
      await api.assignIncident(incident.id, newAssigneeId === 'unassigned' ? null : newAssigneeId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const statusSteps = ['OPEN', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'CLOSED'];
  const currentStepIndex = statusSteps.indexOf(incident.status);

  return (
    <div className="space-y-6">
      {/* Top Banner: Incident Header & Quick Actions */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge variant={incident.severity.toLowerCase() as any} className="text-xs px-2.5 py-0.5">
                {incident.severity}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {incident.id}
              </Badge>
              <span className="text-xs text-slate-400">
                Occurred: <span className="text-slate-200 font-mono">{formatDate(incident.occurredAt)}</span>
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{incident.title}</h1>
            <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">{incident.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                const nextStatus = statusSteps[Math.min(currentStepIndex + 1, statusSteps.length - 1)];
                setTransitionStatus(nextStatus);
                setShowStatusModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Update Workflow Status</span>
            </Button>
          </div>
        </div>

        {/* Workflow Progression Stepper */}
        <div className="mt-6 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between max-w-3xl overflow-x-auto pb-2">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono tracking-wide ${
                      isCurrent
                        ? 'bg-indigo-600 text-white font-semibold ring-2 ring-indigo-400/40'
                        : isPast
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    <span>{step}</span>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Chronological Investigation Timeline & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Deployments Card */}
          <Card className="border-indigo-500/20 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-300">
                  <Link2 className="h-4 w-4" />
                  <span>Associated Deployments & Commits</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {incident.deploymentLinks?.length || 0} Linked
                </Badge>
              </div>
              <CardDescription>
                Evidence-based correlation. Linking associates potential root-cause deployments for forensic analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incident.deploymentLinks && incident.deploymentLinks.length > 0 ? (
                <div className="space-y-3">
                  {incident.deploymentLinks.map((link: any) => (
                    <div
                      key={link.id}
                      className="rounded-md border border-slate-800 bg-slate-950/60 p-3 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Rocket className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="font-semibold text-white">{link.deployment?.version}</span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {link.deployment?.environment}
                          </Badge>
                          <Badge
                            variant={
                              link.confidence === 'high'
                                ? 'critical'
                                : link.confidence === 'medium'
                                ? 'medium'
                                : 'low'
                            }
                            className="text-[10px]"
                          >
                            {link.confidence} Confidence
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Commit: {link.deployment?.commitSha} ({link.deployment?.branch})
                        </div>
                        {link.note && (
                          <div className="text-[11px] text-slate-300 italic bg-slate-900/80 p-2 rounded mt-1 border border-slate-800/60">
                            "{link.note}"
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">
                          Linked by {link.linkedBy?.name || 'Engineer'} • {formatTimeRelative(link.createdAt)}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnlinkDeployment(link.deploymentId)}
                        className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20"
                      >
                        <Unlink className="h-3 w-3 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
                  No deployments currently linked to this incident. Review candidate deployments in the correlation panel.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chronological Investigation Timeline with Occurred vs Ingested Delays */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>Chronological Failure Reconstruction Timeline</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">UTC Ordering</span>
                </div>
              </div>
              <CardDescription>
                Reconstructs events leading up to and during the incident. Highlights telemetry ingestion lag and out-of-order events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {/* Deployment Markers leading to incident */}
                {incident.suggestedCorrelations?.slice(0, 3).map((item: any) => {
                  const dep = item.deployment;
                  return (
                    <div key={dep.id} className="relative group">
                      <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-indigo-500 bg-slate-950" />
                      <div className="rounded border border-indigo-500/20 bg-indigo-950/10 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                            <Rocket className="h-3 w-3" />
                            DEPLOYMENT MARKER: {dep.version} ({dep.environment})
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {formatDate(dep.occurredAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">{dep.releaseNotes || 'Production rollout.'}</p>
                        <div className="text-[10px] text-indigo-400/80 font-mono">
                          Finished {item.diffMinutes}m before incident onset
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Incident Event Marker */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-red-500 bg-red-600 animate-ping" />
                  <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-red-500 bg-red-600" />
                  <div className="rounded border border-red-500/40 bg-red-950/20 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300 flex items-center gap-1.5">
                        <AlertOctagon className="h-3.5 w-3.5" />
                        INCIDENT ONSET DETECTED
                      </span>
                      <span className="font-mono text-[11px] text-red-300">
                        {formatDate(incident.occurredAt)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-200">{incident.title}</div>

                    {/* Dual timestamp badge: occurred vs ingested */}
                    <div className="flex items-center gap-3 pt-1 border-t border-red-900/30 text-[10px]">
                      <div>
                        <span className="text-slate-400">Occurred: </span>
                        <span className="font-mono text-slate-200">{formatDate(incident.occurredAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Ingested: </span>
                        <span className="font-mono text-slate-200">{formatDate(incident.ingestedAt)}</span>
                      </div>
                      <Badge variant="delayed" className="text-[9px] py-0">
                        Telemetry Latency: +2m 12s
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Status Transitions History */}
                {incident.statusHistory?.map((hist: any) => (
                  <div key={hist.id} className="relative">
                    <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border border-slate-700 bg-slate-900" />
                    <div className="rounded border border-slate-800 bg-slate-950/40 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          Workflow Transition &rarr; {hist.toStatus}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {formatDate(hist.changedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{hist.note}</p>
                      <div className="text-[10px] text-slate-500">
                        Updated by {hist.changedBy?.name || 'System'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Investigation Collaboration Stream */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <span>Incident Activity & SRE Collaboration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {incident.comments?.map((comment: any) => (
                  <div key={comment.id} className="rounded border border-slate-800 bg-slate-950/50 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {comment.user?.avatarUrl ? (
                          <img src={comment.user.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold">
                            {comment.user?.name?.substring(0, 1) || 'U'}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-200">{comment.user?.name || 'Engineer'}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {formatTimeRelative(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{comment.content}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add technical hypothesis, runbook step, or log snippet..."
                  className="text-xs bg-slate-950"
                />
                <Button type="submit" size="sm" disabled={submittingComment || !commentText.trim()} className="gap-1.5 text-xs bg-indigo-600">
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Correlated Deployments & Intelligence Panel */}
        <div className="space-y-6">
          {/* Metadata & Assignee Panel */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white">Investigation Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400">Assigned Lead SRE</label>
                <select
                  value={incident.assignedToId || 'unassigned'}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="unassigned">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400">Reporter</label>
                <div className="mt-0.5 text-slate-200 font-medium">{incident.reportedBy?.name || 'System Alert'}</div>
              </div>

              {incident.resolutionNote && (
                <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5 space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Resolution Post-Mortem</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{incident.resolutionNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI / Heuristic Correlated Deployments Panel */}
          <Card className="border-indigo-500/30 bg-slate-900/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Deployment Correlation Leads</span>
                </CardTitle>
              </div>
              <CardDescription>
                Deployments completed within 72h window of incident onset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Scientific disclaimer */}
              <div className="rounded border border-amber-500/30 bg-amber-950/20 p-2.5 text-[11px] text-amber-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Evidence Policy:</strong> Potential correlation does not prove causation. Verify candidate commit diffs before rolling back.
                </span>
              </div>

              {incident.suggestedCorrelations && incident.suggestedCorrelations.length > 0 ? (
                <div className="space-y-3">
                  {incident.suggestedCorrelations.map((sug: any) => {
                    const dep = sug.deployment;
                    return (
                      <div
                        key={dep.id}
                        className={`rounded border p-3 space-y-2 text-xs transition-colors ${
                          sug.isLinked
                            ? 'border-emerald-500/30 bg-emerald-950/10'
                            : 'border-slate-800 bg-slate-950/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{dep.version}</span>
                          <Badge
                            variant={
                              sug.confidence === 'high'
                                ? 'critical'
                                : sug.confidence === 'medium'
                                ? 'medium'
                                : 'low'
                            }
                            className="text-[10px]"
                          >
                            {sug.confidence} correlation
                          </Badge>
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono">
                          {dep.commitSha?.substring(0, 7)} • {formatDate(dep.completedAt || dep.occurredAt)}
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug">{sug.rationale}</p>

                        <div className="pt-1 flex justify-end">
                          {sug.isLinked ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Linked
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLinkDeployment(dep.id, sug.confidence, sug.rationale)}
                              className="h-6 text-[10px] gap-1 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/30"
                            >
                              <Link2 className="h-3 w-3" />
                              Link to Incident
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-xs text-slate-500 py-4">
                  No recent candidate deployments found within 72 hours.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Transition Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Update Incident Workflow Status</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400">Target Status</label>
                <select
                  value={transitionStatus}
                  onChange={(e) => setTransitionStatus(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
                >
                  {statusSteps.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400">Transition Note / Action Log</label>
                <textarea
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  placeholder="Reason for state transition or actions taken..."
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100 h-20"
                />
              </div>

              {(transitionStatus === 'RESOLVED' || transitionStatus === 'CLOSED') && (
                <div>
                  <label className="text-emerald-400 font-semibold">Post-Mortem / Resolution Summary</label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Root cause explanation, hotfix verification, and remediation steps..."
                    className="mt-1 w-full rounded border border-emerald-500/40 bg-slate-950 p-2 text-slate-100 h-24"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleStatusTransition} className="bg-indigo-600">
                Confirm Transition
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
