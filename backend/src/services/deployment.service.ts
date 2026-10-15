import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/store';
import { Deployment, DeploymentStatus, Environment } from '../types';

export class DeploymentService {
  async listDeployments(projectId: string, filters?: { environment?: Environment; status?: DeploymentStatus }) {
    let list = db.deployments.filter((d) => d.projectId === projectId);

    if (filters?.environment) {
      list = list.filter((d) => d.environment === filters.environment);
    }
    if (filters?.status) {
      list = list.filter((d) => d.status === filters.status);
    }

    // Sort descending by occurredAt
    list.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return list.map((dep) => {
      const user = dep.triggeredById ? db.findUserById(dep.triggeredById) : null;
      const commits = db.codeChanges.filter((c) => c.deploymentId === dep.id);
      const linkedIncidents = db.incidentDeploymentLinks.filter((l) => l.deploymentId === dep.id);

      return {
        ...dep,
        triggeredBy: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null,
        commitCount: commits.length,
        incidentCount: linkedIncidents.length,
      };
    });
  }

  async getDeployment(id: string) {
    const dep = db.deployments.find((d) => d.id === id);
    if (!dep) throw new Error('Deployment not found');

    const user = dep.triggeredById ? db.findUserById(dep.triggeredById) : null;
    const history = db.deploymentStatusHistories
      .filter((h) => h.deploymentId === id)
      .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
      .map((h) => {
        const u = h.changedById ? db.findUserById(h.changedById) : null;
        return {
          ...h,
          changedBy: u ? { id: u.id, name: u.name, email: u.email } : null,
        };
      });

    const commits = db.codeChanges.filter((c) => c.deploymentId === id);
    const incidentLinks = db.incidentDeploymentLinks
      .filter((l) => l.deploymentId === id)
      .map((l) => {
        const inc = db.incidents.find((i) => i.id === l.incidentId);
        return {
          ...l,
          incident: inc,
        };
      });

    return {
      ...dep,
      triggeredBy: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null,
      statusHistory: history,
      codeChanges: commits,
      incidentLinks,
    };
  }

  async createDeployment(
    userId: string,
    projectId: string,
    data: {
      environment: Environment;
      version: string;
      commitSha: string;
      branch: string;
      status?: DeploymentStatus;
      startedAt?: string | null;
      completedAt?: string | null;
      occurredAt?: string;
      buildUrl?: string;
      commitUrl?: string;
      releaseNotes?: string;
    }
  ) {
    const project = db.findProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const now = new Date();
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : now;
    const initialStatus = data.status || 'PENDING';

    const deployment: Deployment = {
      id: `dep_${uuidv4().substring(0, 8)}`,
      projectId,
      environment: data.environment,
      version: data.version,
      commitSha: data.commitSha,
      branch: data.branch,
      triggeredById: userId,
      status: initialStatus,
      startedAt: data.startedAt ? new Date(data.startedAt) : (initialStatus === 'RUNNING' ? now : null),
      completedAt: data.completedAt ? new Date(data.completedAt) : (initialStatus === 'SUCCESSFUL' || initialStatus === 'FAILED' ? now : null),
      occurredAt,
      ingestedAt: now,
      buildUrl: data.buildUrl || null,
      commitUrl: data.commitUrl || null,
      releaseNotes: data.releaseNotes || null,
      createdAt: now,
      updatedAt: now,
    };

    db.deployments.push(deployment);

    // Initial status history entry
    db.deploymentStatusHistories.push({
      id: `dsh_${uuidv4().substring(0, 8)}`,
      deploymentId: deployment.id,
      fromStatus: null,
      toStatus: initialStatus,
      changedById: userId,
      note: 'Initial deployment record registered.',
      changedAt: now,
    });

    // Record timeline event
    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId,
      type: 'DEPLOYMENT_CREATED',
      title: `Deployment ${deployment.version} (${deployment.environment}) Initiated`,
      description: `Commit ${deployment.commitSha?.substring(0, 7)} on branch ${deployment.branch}.`,
      metadata: {
        version: deployment.version,
        commitSha: deployment.commitSha,
        branch: deployment.branch,
        environment: deployment.environment,
        status: deployment.status,
      },
      entityId: deployment.id,
      entityType: 'DEPLOYMENT',
      occurredAt,
      ingestedAt: now,
      createdAt: now,
    });

    // Audit log
    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'DEPLOYMENT_CREATE',
      entityType: 'DEPLOYMENT',
      entityId: deployment.id,
      changes: { version: deployment.version, environment: deployment.environment, status: deployment.status },
      createdAt: now,
    });

    return deployment;
  }

  async updateDeploymentStatus(userId: string, id: string, newStatus: DeploymentStatus, note?: string) {
    const dep = db.deployments.find((d) => d.id === id);
    if (!dep) throw new Error('Deployment not found');

    const fromStatus = dep.status;
    if (fromStatus === newStatus) {
      return dep;
    }

    const now = new Date();
    dep.status = newStatus;
    dep.updatedAt = now;

    if (newStatus === 'RUNNING' && !dep.startedAt) {
      dep.startedAt = now;
    }
    if ((newStatus === 'SUCCESSFUL' || newStatus === 'FAILED' || newStatus === 'ROLLED_BACK') && !dep.completedAt) {
      dep.completedAt = now;
    }

    // Record in history
    db.deploymentStatusHistories.push({
      id: `dsh_${uuidv4().substring(0, 8)}`,
      deploymentId: dep.id,
      fromStatus,
      toStatus: newStatus,
      changedById: userId,
      note: note || `Status transitioned to ${newStatus}`,
      changedAt: now,
    });

    // Record in timeline
    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId: dep.projectId,
      type: 'DEPLOYMENT_STATUS_CHANGED',
      title: `Deployment ${dep.version} Status: ${newStatus}`,
      description: note || `Deployment transitioned from ${fromStatus} to ${newStatus}.`,
      metadata: {
        deploymentId: dep.id,
        version: dep.version,
        fromStatus,
        toStatus: newStatus,
        note,
      },
      entityId: dep.id,
      entityType: 'DEPLOYMENT',
      occurredAt: now,
      ingestedAt: now,
      createdAt: now,
    });

    // Audit log
    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'DEPLOYMENT_STATUS_UPDATE',
      entityType: 'DEPLOYMENT',
      entityId: dep.id,
      changes: { fromStatus, toStatus: newStatus, note },
      createdAt: now,
    });

    return dep;
  }
}

export const deploymentService = new DeploymentService();
