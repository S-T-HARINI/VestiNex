import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/store';
import { Incident, IncidentSeverity, IncidentStatus, IncidentDeploymentLink, Comment, IncidentStatusHistory } from '../types';

export class IncidentService {
  async listIncidents(projectId: string, filters?: { severity?: IncidentSeverity; status?: IncidentStatus }) {
    let list = db.incidents.filter((i) => i.projectId === projectId);

    if (filters?.severity) {
      list = list.filter((i) => i.severity === filters.severity);
    }
    if (filters?.status) {
      list = list.filter((i) => i.status === filters.status);
    }

    list.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return list.map((inc) => {
      const reporter = db.findUserById(inc.reportedById);
      const assignee = inc.assignedToId ? db.findUserById(inc.assignedToId) : null;
      const commentCount = db.comments.filter((c) => c.incidentId === inc.id).length;
      const linkedDeployments = db.incidentDeploymentLinks.filter((l) => l.incidentId === inc.id);

      return {
        ...inc,
        reportedBy: reporter ? { id: reporter.id, name: reporter.name, email: reporter.email, avatarUrl: reporter.avatarUrl } : null,
        assignedTo: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email, avatarUrl: assignee.avatarUrl } : null,
        commentCount,
        linkedDeploymentCount: linkedDeployments.length,
      };
    });
  }

  async getIncident(id: string) {
    const inc = db.incidents.find((i) => i.id === id);
    if (!inc) throw new Error('Incident not found');

    const reporter = db.findUserById(inc.reportedById);
    const assignee = inc.assignedToId ? db.findUserById(inc.assignedToId) : null;

    const comments = db.comments
      .filter((c) => c.incidentId === id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((c) => {
        const u = db.findUserById(c.userId);
        return {
          ...c,
          user: u ? { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl } : null,
        };
      });

    const statusHistory = db.incidentStatusHistories
      .filter((h) => h.incidentId === id)
      .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
      .map((h) => {
        const u = h.changedById ? db.findUserById(h.changedById) : null;
        return {
          ...h,
          changedBy: u ? { id: u.id, name: u.name, email: u.email } : null,
        };
      });

    const deploymentLinks = db.incidentDeploymentLinks
      .filter((l) => l.incidentId === id)
      .map((l) => {
        const dep = db.deployments.find((d) => d.id === l.deploymentId);
        const linker = l.linkedById ? db.findUserById(l.linkedById) : null;
        return {
          ...l,
          deployment: dep,
          linkedBy: linker ? { id: linker.id, name: linker.name } : null,
        };
      });

    // Calculate candidate deployments for correlation investigation (deployments completed within 72h prior to incident)
    const suggestedCorrelations = this.computeSuggestedCorrelations(inc);

    return {
      ...inc,
      reportedBy: reporter ? { id: reporter.id, name: reporter.name, email: reporter.email, avatarUrl: reporter.avatarUrl } : null,
      assignedTo: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email, avatarUrl: assignee.avatarUrl } : null,
      comments,
      statusHistory,
      deploymentLinks,
      suggestedCorrelations,
    };
  }

  computeSuggestedCorrelations(incident: Incident) {
    const incTime = new Date(incident.occurredAt).getTime();
    const candidateDeployments = db.deployments.filter((d) => d.projectId === incident.projectId);

    return candidateDeployments
      .map((dep) => {
        const depTime = new Date(dep.completedAt || dep.occurredAt).getTime();
        const diffMs = incTime - depTime;
        const diffMinutes = Math.round(diffMs / 60000);

        // Already linked?
        const isLinked = db.incidentDeploymentLinks.some((l) => l.incidentId === incident.id && l.deploymentId === dep.id);

        let confidence: 'high' | 'medium' | 'low' = 'low';
        let rationale = '';

        if (diffMinutes >= 0 && diffMinutes <= 120) {
          confidence = 'high';
          rationale = `Temporal proximity: Deployment finished ${diffMinutes} minutes before incident occurred. High correlation potential. Note: Correlation provides investigative signal; causation requires diff verification.`;
        } else if (diffMinutes > 120 && diffMinutes <= 1440) {
          confidence = 'medium';
          rationale = `Temporal proximity: Deployment finished ${Math.round(diffMinutes / 60)} hours before incident onset. Intermediate investigative lead.`;
        } else if (diffMinutes > 1440 && diffMinutes <= 4320) {
          confidence = 'low';
          rationale = `Temporal distance: Deployment finished ${Math.round(diffMinutes / 1440)} days before incident. Lower baseline probability unless delayed cron or latent trigger.`;
        } else {
          return null; // Deployment occurred after incident or too far in past
        }

        return {
          deployment: dep,
          confidence,
          diffMinutes,
          rationale,
          isLinked,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.diffMinutes - b.diffMinutes);
  }

  async createIncident(
    userId: string,
    projectId: string,
    data: {
      title: string;
      description?: string;
      severity: IncidentSeverity;
      status?: IncidentStatus;
      assignedToId?: string | null;
      occurredAt?: string;
      linkedDeploymentId?: string | null;
      linkConfidence?: 'high' | 'medium' | 'low';
      linkNote?: string;
    }
  ) {
    const project = db.findProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const now = new Date();
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : now;
    const initialStatus = data.status || 'OPEN';

    const incident: Incident = {
      id: `inc_${uuidv4().substring(0, 8)}`,
      projectId,
      title: data.title,
      description: data.description || null,
      severity: data.severity,
      status: initialStatus,
      reportedById: userId,
      assignedToId: data.assignedToId || null,
      resolvedAt: initialStatus === 'RESOLVED' || initialStatus === 'CLOSED' ? now : null,
      resolutionNote: null,
      occurredAt,
      ingestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    db.incidents.push(incident);

    // Initial status history
    db.incidentStatusHistories.push({
      id: `ish_${uuidv4().substring(0, 8)}`,
      incidentId: incident.id,
      fromStatus: null,
      toStatus: initialStatus,
      changedById: userId,
      note: 'Incident registered.',
      changedAt: now,
    });

    // Link deployment if provided
    if (data.linkedDeploymentId) {
      db.incidentDeploymentLinks.push({
        id: `idl_${uuidv4().substring(0, 8)}`,
        incidentId: incident.id,
        deploymentId: data.linkedDeploymentId,
        confidence: data.linkConfidence || 'medium',
        linkedById: userId,
        note: data.linkNote || 'Associated during incident creation.',
        createdAt: now,
      });
    }

    // Timeline event
    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId,
      type: 'INCIDENT_CREATED',
      title: `${incident.severity} Incident: ${incident.title}`,
      description: incident.description || 'Incident reported.',
      metadata: {
        severity: incident.severity,
        status: incident.status,
        assignedToId: incident.assignedToId,
      },
      entityId: incident.id,
      entityType: 'INCIDENT',
      occurredAt,
      ingestedAt: now,
      createdAt: now,
    });

    // Audit log
    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'INCIDENT_CREATE',
      entityType: 'INCIDENT',
      entityId: incident.id,
      changes: { title: incident.title, severity: incident.severity, status: incident.status },
      createdAt: now,
    });

    return incident;
  }

  async updateIncident(
    userId: string,
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      severity: IncidentSeverity;
      assignedToId: string | null;
    }>
  ) {
    const inc = db.incidents.find((i) => i.id === id);
    if (!inc) throw new Error('Incident not found');

    if (data.title !== undefined) inc.title = data.title;
    if (data.description !== undefined) inc.description = data.description;
    if (data.severity !== undefined) inc.severity = data.severity;
    if (data.assignedToId !== undefined) inc.assignedToId = data.assignedToId;
    inc.updatedAt = new Date();

    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'INCIDENT_UPDATE',
      entityType: 'INCIDENT',
      entityId: inc.id,
      changes: data,
      createdAt: new Date(),
    });

    return inc;
  }

  async updateIncidentStatus(
    userId: string,
    id: string,
    newStatus: IncidentStatus,
    note?: string,
    resolutionNote?: string
  ) {
    const inc = db.incidents.find((i) => i.id === id);
    if (!inc) throw new Error('Incident not found');

    const fromStatus = inc.status;
    if (fromStatus === newStatus && !resolutionNote) {
      return inc;
    }

    const now = new Date();
    inc.status = newStatus;
    inc.updatedAt = now;

    if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
      if (!inc.resolvedAt) inc.resolvedAt = now;
      if (resolutionNote) inc.resolutionNote = resolutionNote;
    } else {
      inc.resolvedAt = null;
    }

    // Record status history
    db.incidentStatusHistories.push({
      id: `ish_${uuidv4().substring(0, 8)}`,
      incidentId: inc.id,
      fromStatus,
      toStatus: newStatus,
      changedById: userId,
      note: note || `Status transitioned to ${newStatus}`,
      changedAt: now,
    });

    // Record timeline event
    const eventType = newStatus === 'RESOLVED' ? 'INCIDENT_RESOLVED' : 'INCIDENT_STATUS_CHANGED';
    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId: inc.projectId,
      type: eventType,
      title: `Incident Status: ${newStatus}`,
      description: note || `Transitioned from ${fromStatus} to ${newStatus}.`,
      metadata: {
        incidentId: inc.id,
        fromStatus,
        toStatus: newStatus,
        note,
        resolutionNote,
      },
      entityId: inc.id,
      entityType: 'INCIDENT',
      occurredAt: now,
      ingestedAt: now,
      createdAt: now,
    });

    // Audit log
    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'INCIDENT_STATUS_UPDATE',
      entityType: 'INCIDENT',
      entityId: inc.id,
      changes: { fromStatus, toStatus: newStatus, note, resolutionNote },
      createdAt: now,
    });

    return inc;
  }

  async assignIncident(userId: string, id: string, assignedToId: string | null) {
    const inc = db.incidents.find((i) => i.id === id);
    if (!inc) throw new Error('Incident not found');

    const previousAssignee = inc.assignedToId;
    inc.assignedToId = assignedToId;
    inc.updatedAt = new Date();

    const newAssigneeUser = assignedToId ? db.findUserById(assignedToId) : null;

    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId: inc.projectId,
      type: 'INCIDENT_ASSIGNED',
      title: `Incident Assigned to ${newAssigneeUser ? newAssigneeUser.name : 'Unassigned'}`,
      description: `Ownership assigned for incident investigation.`,
      metadata: { assignedToId, previousAssignee },
      entityId: inc.id,
      entityType: 'INCIDENT',
      occurredAt: new Date(),
      ingestedAt: new Date(),
      createdAt: new Date(),
    });

    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'INCIDENT_ASSIGNMENT',
      entityType: 'INCIDENT',
      entityId: inc.id,
      changes: { previousAssignee, assignedToId },
      createdAt: new Date(),
    });

    return inc;
  }

  async linkDeployment(userId: string, incidentId: string, deploymentId: string, confidence: 'high' | 'medium' | 'low', note?: string) {
    const inc = db.incidents.find((i) => i.id === incidentId);
    if (!inc) throw new Error('Incident not found');

    const dep = db.deployments.find((d) => d.id === deploymentId);
    if (!dep) throw new Error('Deployment not found');

    const existing = db.incidentDeploymentLinks.find((l) => l.incidentId === incidentId && l.deploymentId === deploymentId);
    if (existing) {
      existing.confidence = confidence;
      if (note) existing.note = note;
      return existing;
    }

    const link: IncidentDeploymentLink = {
      id: `idl_${uuidv4().substring(0, 8)}`,
      incidentId,
      deploymentId,
      confidence,
      linkedById: userId,
      note: note || null,
      createdAt: new Date(),
    };

    db.incidentDeploymentLinks.push(link);

    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'INCIDENT_DEPLOYMENT_LINK',
      entityType: 'INCIDENT',
      entityId: inc.id,
      changes: { deploymentId, confidence, note },
      createdAt: new Date(),
    });

    return link;
  }

  async unlinkDeployment(userId: string, incidentId: string, deploymentId: string) {
    const index = db.incidentDeploymentLinks.findIndex((l) => l.incidentId === incidentId && l.deploymentId === deploymentId);
    if (index === -1) throw new Error('Link not found');

    db.incidentDeploymentLinks.splice(index, 1);

    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'INCIDENT_DEPLOYMENT_UNLINK',
      entityType: 'INCIDENT',
      entityId: incidentId,
      changes: { deploymentId },
      createdAt: new Date(),
    });

    return { success: true };
  }

  async addComment(userId: string, incidentId: string, content: string) {
    const inc = db.incidents.find((i) => i.id === incidentId);
    if (!inc) throw new Error('Incident not found');

    const now = new Date();
    const comment: Comment = {
      id: `cmt_${uuidv4().substring(0, 8)}`,
      incidentId,
      userId,
      content,
      createdAt: now,
      updatedAt: now,
    };

    db.comments.push(comment);

    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId: inc.projectId,
      type: 'COMMENT_ADDED',
      title: 'Investigation Comment Added',
      description: content.length > 80 ? `${content.substring(0, 80)}...` : content,
      metadata: { incidentId, commentId: comment.id },
      entityId: comment.id,
      entityType: 'COMMENT',
      occurredAt: now,
      ingestedAt: now,
      createdAt: now,
    });

    const user = db.findUserById(userId);
    return {
      ...comment,
      user: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null,
    };
  }

  async getComments(incidentId: string) {
    return db.comments
      .filter((c) => c.incidentId === incidentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((c) => {
        const u = db.findUserById(c.userId);
        return {
          ...c,
          user: u ? { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl } : null,
        };
      });
  }

  async getHistory(incidentId: string) {
    return db.incidentStatusHistories
      .filter((h) => h.incidentId === incidentId)
      .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
      .map((h) => {
        const u = h.changedById ? db.findUserById(h.changedById) : null;
        return {
          ...h,
          changedBy: u ? { id: u.id, name: u.name, email: u.email } : null,
        };
      });
  }
}

export const incidentService = new IncidentService();
