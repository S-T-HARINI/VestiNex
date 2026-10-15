import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/store';
import { CodeChange } from '../types';

export class CodeChangeService {
  async listCodeChanges(projectId: string) {
    const changes = db.codeChanges.filter((c) => c.projectId === projectId);
    changes.sort((a, b) => new Date(b.committedAt).getTime() - new Date(a.committedAt).getTime());

    return changes.map((c) => {
      const dep = c.deploymentId ? db.deployments.find((d) => d.id === c.deploymentId) : null;
      return {
        ...c,
        deployment: dep ? { id: dep.id, version: dep.version, environment: dep.environment, status: dep.status } : null,
      };
    });
  }

  async getCodeChange(id: string) {
    const change = db.codeChanges.find((c) => c.id === id);
    if (!change) throw new Error('Code change record not found');

    const dep = change.deploymentId ? db.deployments.find((d) => d.id === change.deploymentId) : null;
    return {
      ...change,
      deployment: dep,
    };
  }

  async recordCodeChange(
    userId: string,
    projectId: string,
    data: {
      commitSha: string;
      message: string;
      author: string;
      branch?: string;
      repoUrl?: string;
      committedAt: string;
      deploymentId?: string | null;
      pullRequestUrl?: string;
      filesChanged?: string;
    }
  ) {
    const project = db.findProjectById(projectId);
    if (!project) throw new Error('Project not found');

    // Prevent duplicate commits within project
    const existing = db.codeChanges.find((c) => c.projectId === projectId && c.commitSha === data.commitSha);
    if (existing) {
      throw new Error(`Commit SHA ${data.commitSha} has already been recorded for this project.`);
    }

    const now = new Date();
    const committedAt = new Date(data.committedAt);

    const codeChange: CodeChange = {
      id: `commit_${uuidv4().substring(0, 8)}`,
      projectId,
      deploymentId: data.deploymentId || null,
      commitSha: data.commitSha,
      message: data.message,
      author: data.author,
      branch: data.branch || 'main',
      repoUrl: data.repoUrl || project.repoUrl || null,
      committedAt,
      pullRequestUrl: data.pullRequestUrl || null,
      filesChanged: data.filesChanged || null,
      createdAt: now,
    };

    db.codeChanges.push(codeChange);

    // Record timeline event
    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId,
      type: 'CODE_CHANGE_RECORDED',
      title: `Commit ${codeChange.commitSha.substring(0, 7)} Pushed`,
      description: codeChange.message,
      metadata: {
        author: codeChange.author,
        commitSha: codeChange.commitSha,
        branch: codeChange.branch,
        filesChanged: codeChange.filesChanged,
      },
      entityId: codeChange.id,
      entityType: 'CODE_CHANGE',
      occurredAt: committedAt,
      ingestedAt: now,
      createdAt: now,
    });

    // Audit log
    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'CODE_CHANGE_RECORDED',
      entityType: 'CODE_CHANGE',
      entityId: codeChange.id,
      changes: { commitSha: codeChange.commitSha, message: codeChange.message },
      createdAt: now,
    });

    return codeChange;
  }
}

export const codeChangeService = new CodeChangeService();
