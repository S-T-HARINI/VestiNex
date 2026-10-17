'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatTimeRelative } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CopyButton } from '@/components/ui/copy-button';
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
  AlertCircle,
  UserCheck,
  UserPlus,
  Users,
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
  projectId?: string;
}

export function InvestigationWorkspace({ incident, onRefresh, users, projectId }: Props) {
  const targetProjectId = projectId || incident.projectId || incident.project_id;
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState<string>('');
  const [transitionNote, setTransitionNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Invite member state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'DEVELOPER' | 'VIEWER'>('DEVELOPER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [registeredCandidates, setRegisteredCandidates] = useState<any[]>([]);

  const openInviteModal = async () => {
    setInviteError('');
    setInviteSuccess('');
    setShowInviteModal(true);
    try {
      const res = await api.getUsers();
      if (res?.users) {
        const currentMemberIds = new Set(users.map((u) => u.id));
        const demoEmails = new Set(['admin@vestinex.io', 'dev@vestinex.io', 'lead@vestinex.io', 'viewer@vestinex.io']);
        const demoIds = new Set(['usr_admin_001', 'usr_dev_002', 'usr_lead_003', 'usr_viewer_004']);
        const filtered = res.users.filter(
          (u: any) =>
            !currentMemberIds.has(u.id) &&
            !demoIds.has(u.id) &&
            !demoEmails.has(u.email?.toLowerCase()) &&
            !u.email?.toLowerCase().endsWith('@vestinex.io') &&
            !u.email?.toLowerCase().endsWith('@vestinex-test.io')
        );
        setRegisteredCandidates(filtered);
      }
    } catch (e) {
      // fallback to manual email entry
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !targetProjectId) return;

    setInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await api.addProjectMember(targetProjectId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      const addedUserName = res.member?.user?.name || inviteEmail.trim();
      setInviteSuccess(`Successfully added ${addedUserName} to this project workspace!`);
      setInviteEmail('');
      await onRefresh();
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess('');
      }, 1200);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to add member to project workspace');
    } finally {
      setInviting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.addComment(incident.id, commentText);
      setCommentText('');
      if (res?.comment && incident?.comments) {
        incident.comments.push(res.comment);
      }
      await onRefresh();
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
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge variant={incident.severity.toLowerCase() as any} className="text-xs px-2.5 py-0.5">
                {incident.severity}
              </Badge>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {incident.id}
                </Badge>
                <CopyButton text={incident.id} />
              </div>
              <span className="text-xs text-foreground-secondary">
                Occurred: <span className="text-foreground font-mono tabular-nums">{formatDate(incident.occurredAt)}</span>
              </span>
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">{incident.title}</h1>
            <p className="text-xs text-foreground-secondary max-w-4xl leading-relaxed">{incident.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                const nextStatus = statusSteps[Math.min(currentStepIndex + 1, statusSteps.length - 1)];
                setTransitionStatus(nextStatus);
                setShowStatusModal(true);
              }}
              className="text-xs gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Update Workflow Status</span>
            </Button>
          </div>
        </div>

        {/* Workflow Progression Stepper */}
        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center justify-between max-w-3xl overflow-x-auto pb-2">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono tracking-wide ${
                      isCurrent
                        ? 'bg-accent text-white font-semibold'
                        : isPast
                        ? 'bg-status-success/15 text-status-success border border-status-success/30'
                        : 'bg-surface text-foreground-muted border border-border'
                    }`}
                  >
                    <span>{step}</span>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-foreground-muted" />
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
          <Card className="border-accent/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Link2 className="h-4 w-4 text-accent" />
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
                      className="rounded-md border border-border bg-surface p-3 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Rocket className="h-3.5 w-3.5 text-accent" />
                          <span className="font-semibold text-foreground">{link.deployment?.version}</span>
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
                        <div className="text-[11px] text-foreground-secondary font-mono flex items-center gap-1.5">
                          <span>Commit: {link.deployment?.commitSha} ({link.deployment?.branch})</span>
                          <CopyButton text={link.deployment?.commitSha} />
                        </div>
                        {link.note && (
                          <div className="text-[11px] text-foreground-secondary italic bg-card p-2 rounded mt-1 border border-border">
                            "{link.note}"
                          </div>
                        )}
                        <div className="text-[10px] text-foreground-muted">
                          Linked by {link.linkedBy?.name || 'Engineer'} • {formatTimeRelative(link.createdAt)}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnlinkDeployment(link.deploymentId)}
                        className="h-7 text-xs text-status-error hover:text-status-error hover:bg-status-error/10"
                      >
                        <Unlink className="h-3 w-3 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-dashed border-border p-6 text-center text-xs text-foreground-muted">
                  No deployments currently linked to this incident. Review candidate deployments in the correlation panel.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chronological Investigation Timeline with Occurred vs Ingested Delays */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-accent" />
                  <span>Chronological Failure Reconstruction Timeline</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-foreground-muted">UTC Ordering</span>
                </div>
              </div>
              <CardDescription>
                Reconstructs events leading up to and during the incident. Highlights telemetry ingestion lag and out-of-order events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {/* Deployment Markers leading to incident */}
                {incident.suggestedCorrelations?.slice(0, 3).map((item: any) => {
                  const dep = item.deployment;
                  return (
                    <div key={dep.id} className="relative group">
                      <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-accent bg-background" />
                      <div className="rounded border border-accent/20 bg-surface/50 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Rocket className="h-3 w-3 text-accent" />
                            DEPLOYMENT MARKER: {dep.version} ({dep.environment})
                          </span>
                          <span className="font-mono tabular-nums text-[10px] text-foreground-secondary">
                            {formatDate(dep.occurredAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground-secondary">{dep.releaseNotes || 'Production rollout.'}</p>
                        <div className="text-[10px] text-accent font-mono tabular-nums">
                          Finished {item.diffMinutes}m before incident onset
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Incident Event Marker */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-status-error bg-status-error" />
                  <div className="rounded border border-status-error/40 bg-status-error/10 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-status-error flex items-center gap-1.5">
                        <AlertOctagon className="h-3.5 w-3.5" />
                        INCIDENT ONSET DETECTED
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-status-error">
                        {formatDate(incident.occurredAt)}
                      </span>
                    </div>
                    <div className="text-[11px] text-foreground font-medium">{incident.title}</div>

                    {/* Dual timestamp badge: occurred vs ingested */}
                    <div className="flex items-center gap-3 pt-1 border-t border-status-error/20 text-[10px] flex-wrap">
                      <div>
                        <span className="text-foreground-secondary">Occurred: </span>
                        <span className="font-mono tabular-nums text-foreground">{formatDate(incident.occurredAt)}</span>
                      </div>
                      <div>
                        <span className="text-foreground-secondary">Ingested: </span>
                        <span className="font-mono tabular-nums text-foreground">{formatDate(incident.ingestedAt)}</span>
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
                    <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border border-border bg-card" />
                    <div className="rounded border border-border bg-surface/50 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          Workflow Transition &rarr; {hist.toStatus}
                        </span>
                        <span className="font-mono tabular-nums text-[10px] text-foreground-muted">
                          {formatDate(hist.changedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground-secondary">{hist.note}</p>
                      <div className="text-[10px] text-foreground-muted">
                        Updated by {hist.changedBy?.name || 'System'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Investigation Collaboration Stream */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <MessageSquare className="h-4 w-4 text-accent" />
                <span>Incident Activity & SRE Collaboration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {incident.comments?.map((comment: any) => (
                  <div key={comment.id} className="rounded border border-border bg-surface p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {comment.user?.avatarUrl ? (
                          <img src={comment.user.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-border text-[10px] flex items-center justify-center font-bold text-foreground">
                            {comment.user?.name?.substring(0, 1) || 'U'}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-foreground">{comment.user?.name || 'Engineer'}</span>
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-foreground-muted">
                        {formatTimeRelative(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-secondary leading-relaxed">{comment.content}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add technical hypothesis, runbook step, or log snippet..."
                  className="text-xs"
                />
                <Button type="submit" size="sm" disabled={submittingComment || !commentText.trim()} className="gap-1.5 text-xs">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Investigation Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-semibold text-foreground-muted">Assigned Lead SRE</label>

                {users.length === 0 ? (
                  <div className="mt-1.5 rounded border border-dashed border-border bg-card/40 p-2.5 text-center text-xs space-y-1">
                    <p className="text-foreground-muted">No eligible assignees in this project workspace.</p>
                    <p className="text-[10px] text-foreground-secondary">
                      Only registered users added to this workspace can be assigned.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openInviteModal}
                      className="mt-1 text-xs h-7 gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      <span>Invite Registered User</span>
                    </Button>
                  </div>
                ) : (
                  <>
                    <select
                      value={incident.assignedToId || 'unassigned'}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="unassigned">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-foreground-muted">
                      <span>{users.length} eligible project {users.length === 1 ? 'member' : 'members'}</span>
                      <button
                        type="button"
                        onClick={openInviteModal}
                        className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <UserPlus className="h-3 w-3" />
                        <span>Invite Member</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-foreground-muted">Reporter</label>
                <div className="mt-0.5 text-foreground font-medium">{incident.reportedBy?.name || 'System Alert'}</div>
              </div>

              {incident.resolutionNote && (
                <div className="rounded border border-status-success/30 bg-status-success/10 p-2.5 space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-status-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Resolution Post-Mortem</span>
                  </div>
                  <p className="text-[11px] text-foreground-secondary leading-relaxed">{incident.resolutionNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI / Heuristic Correlated Deployments Panel */}
          <Card className="border-accent/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>Deployment Correlation Leads</span>
                </CardTitle>
              </div>
              <CardDescription>
                Deployments completed within 72h window of incident onset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Scientific disclaimer */}
              <div className="rounded border border-status-warning/30 bg-status-warning/10 p-2.5 text-[11px] text-status-warning flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-status-warning mt-0.5" />
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
                            ? 'border-status-success/40 bg-status-success/10'
                            : 'border-border bg-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{dep.version}</span>
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

                        <div className="text-[11px] text-foreground-secondary font-mono tabular-nums flex items-center gap-1.5">
                          <span>{dep.commitSha?.substring(0, 7)} • {formatDate(dep.completedAt || dep.occurredAt)}</span>
                          <CopyButton text={dep.commitSha} />
                        </div>

                        <p className="text-[11px] text-foreground-secondary leading-snug">{sug.rationale}</p>

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
                              className="h-6 text-[10px] gap-1"
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
                <div className="text-center text-xs text-foreground-muted py-4">
                  No recent candidate deployments found within 72 hours.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Transition Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-card p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">Update Incident Workflow Status</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-foreground-secondary">Target Status</label>
                <select
                  value={transitionStatus}
                  onChange={(e) => setTransitionStatus(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {statusSteps.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-foreground-secondary">Transition Note / Action Log</label>
                <textarea
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  placeholder="Reason for state transition or actions taken..."
                  className="mt-1 w-full rounded border border-border bg-background p-2 text-foreground h-20 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {(transitionStatus === 'RESOLVED' || transitionStatus === 'CLOSED') && (
                <div>
                  <label className="text-status-success font-semibold">Post-Mortem / Resolution Summary</label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Root cause explanation, hotfix verification, and remediation steps..."
                    className="mt-1 w-full rounded border border-status-success/40 bg-background p-2 text-foreground h-24 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleStatusTransition}>
                Confirm Transition
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member to Workspace Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Invite Member to Project Workspace</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowInviteModal(false); setInviteError(''); setInviteSuccess(''); }}
                className="text-foreground-muted hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-foreground-secondary leading-relaxed">
              Connect a genuine registered user to this project workspace. Once invited, they will be granted authorized access to project incidents and will appear as an eligible assignee.
            </p>

            {inviteError && (
              <div className="rounded border border-status-error/30 bg-status-error/10 p-2.5 text-xs text-status-error flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-status-error" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="rounded border border-status-success/30 bg-status-success/10 p-2.5 text-xs text-status-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Registered User Email *</label>
                <Input
                  type="email"
                  name="vestinex_invite_email"
                  autoComplete="off"
                  list="registered-candidates-list"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. admin3@gmail.com"
                  required
                  className="text-xs"
                />
                <datalist id="registered-candidates-list">
                  {registeredCandidates.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </datalist>
                <span className="text-[10px] text-foreground-muted">
                  User must already have a registered account in the system.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Project Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="DEVELOPER">DEVELOPER — Respond, investigate & resolve incidents</option>
                  <option value="ADMIN">ADMIN — Full project administration & member access</option>
                  <option value="VIEWER">VIEWER — Read-only observation & audit access</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowInviteModal(false); setInviteError(''); setInviteSuccess(''); }}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={inviting || !inviteEmail.trim()}
                  className="text-xs gap-1"
                >
                  <UserPlus className="h-3 w-3" />
                  <span>{inviting ? 'Inviting...' : 'Invite to Workspace'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
