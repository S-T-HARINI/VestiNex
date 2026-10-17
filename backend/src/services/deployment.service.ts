import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { Deployment, DeploymentStatus, Environment } from '../types';
import { AppError } from '../middleware/errorHandler';
import { realtimeService } from './realtime.service';

export class DeploymentService {
  async listDeployments(projectId: string, filters?: { environment?: Environment; status?: DeploymentStatus }) {
    let sql = `
      SELECT d.*,
        u.name as "triggeredByName", u.email as "triggeredByEmail", u.avatar_url as "triggeredByAvatar",
        (SELECT COUNT(*) FROM code_changes WHERE deployment_id = d.id) as "commitCount",
        (SELECT COUNT(*) FROM incident_deployment_links WHERE deployment_id = d.id) as "incidentCount"
      FROM deployments d
      LEFT JOIN users u ON u.id = d.triggered_by_id
      WHERE d.project_id = $1
    `;
    const params: any[] = [projectId];

    if (filters?.environment) {
      params.push(filters.environment);
      sql += ` AND d.environment = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND d.status = $${params.length}`;
    }

    sql += ' ORDER BY d.occurred_at DESC;';

    const rows = await pgDb.query<any>(sql, params);
    return rows.map((dep) => ({
      id: dep.id,
      projectId: dep.project_id,
      environment: dep.environment,
      version: dep.version,
      commitSha: dep.commit_sha,
      branch: dep.branch,
      triggeredById: dep.triggered_by_id,
      status: dep.status,
      startedAt: dep.started_at,
      completedAt: dep.completed_at,
      occurredAt: dep.occurred_at,
      ingestedAt: dep.ingested_at,
      buildUrl: dep.build_url,
      commitUrl: dep.commit_url,
      releaseNotes: dep.release_notes,
      createdAt: dep.created_at,
      updatedAt: dep.updated_at,
      triggeredBy: dep.triggered_by_id
        ? {
            id: dep.triggered_by_id,
            name: dep.triggeredByName,
            email: dep.triggeredByEmail,
            avatarUrl: dep.triggeredByAvatar,
          }
        : null,
      commitCount: parseInt(dep.commitCount, 10) || 0,
      incidentCount: parseInt(dep.incidentCount, 10) || 0,
    }));
  }

  async getDeployment(id: string) {
    const depRows = await pgDb.query<any>(
      `SELECT d.*, u.name as "triggeredByName", u.email as "triggeredByEmail", u.avatar_url as "triggeredByAvatar"
       FROM deployments d
       LEFT JOIN users u ON u.id = d.triggered_by_id
       WHERE d.id = $1 LIMIT 1;`,
      [id]
    );

    if (depRows.length === 0) throw new AppError('Deployment not found', 404);
    const dep = depRows[0];

    // Status history
    const historyRows = await pgDb.query<any>(
      `SELECT dsh.*, u.name as "changedByName", u.email as "changedByEmail"
       FROM deployment_status_history dsh
       LEFT JOIN users u ON u.id = dsh.changed_by_id
       WHERE dsh.deployment_id = $1
       ORDER BY dsh.changed_at ASC;`,
      [id]
    );

    // Code changes
    const commitRows = await pgDb.query<any>(
      `SELECT * FROM code_changes WHERE deployment_id = $1 ORDER BY committed_at DESC;`,
      [id]
    );

    // Linked incidents
    const linkRows = await pgDb.query<any>(
      `SELECT idl.*, i.title as "incidentTitle", i.severity as "incidentSeverity", i.status as "incidentStatus",
              u.name as "linkedByName"
       FROM incident_deployment_links idl
       INNER JOIN incidents i ON i.id = idl.incident_id
       LEFT JOIN users u ON u.id = idl.linked_by_id
       WHERE idl.deployment_id = $1;`,
      [id]
    );

    return {
      id: dep.id,
      projectId: dep.project_id,
      environment: dep.environment,
      version: dep.version,
      commitSha: dep.commit_sha,
      branch: dep.branch,
      status: dep.status,
      startedAt: dep.started_at,
      completedAt: dep.completed_at,
      occurredAt: dep.occurred_at,
      ingestedAt: dep.ingested_at,
      buildUrl: dep.build_url,
      commitUrl: dep.commit_url,
      releaseNotes: dep.release_notes,
      createdAt: dep.created_at,
      updatedAt: dep.updated_at,
      triggeredBy: dep.triggered_by_id
        ? {
            id: dep.triggered_by_id,
            name: dep.triggeredByName,
            email: dep.triggeredByEmail,
            avatarUrl: dep.triggeredByAvatar,
          }
        : null,
      statusHistory: historyRows.map((h) => ({
        id: h.id,
        deploymentId: h.deployment_id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        changedById: h.changed_by_id,
        note: h.note,
        changedAt: h.changed_at,
        changedBy: h.changed_by_id ? { id: h.changed_by_id, name: h.changedByName, email: h.changedByEmail } : null,
      })),
      codeChanges: commitRows.map((c) => ({
        id: c.id,
        projectId: c.project_id,
        deploymentId: c.deployment_id,
        commitSha: c.commit_sha,
        message: c.message,
        author: c.author,
        branch: c.branch,
        repoUrl: c.repo_url,
        committedAt: c.committed_at,
        pullRequestUrl: c.pull_request_url,
        filesChanged: c.files_changed,
        createdAt: c.created_at,
      })),
      incidentLinks: linkRows.map((l) => ({
        id: l.id,
        incidentId: l.incident_id,
        deploymentId: l.deployment_id,
        confidence: l.confidence,
        note: l.note,
        createdAt: l.created_at,
        incident: {
          id: l.incident_id,
          title: l.incidentTitle,
          severity: l.incidentSeverity,
          status: l.incidentStatus,
        },
        linkedBy: l.linked_by_id ? { id: l.linked_by_id, name: l.linkedByName } : null,
      })),
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
    const projRows = await pgDb.query('SELECT id FROM projects WHERE id = $1 LIMIT 1;', [projectId]);
    if (projRows.length === 0) throw new AppError('Project not found', 404);

    const now = new Date();
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : now;
    const initialStatus = data.status || 'PENDING';
    const depId = `dep_${uuidv4().substring(0, 8)}`;
    const historyId = `dsh_${uuidv4().substring(0, 8)}`;
    const eventId = `tle_${uuidv4().substring(0, 8)}`;
    const auditId = `aud_${uuidv4().substring(0, 8)}`;

    const startedAt = data.startedAt ? new Date(data.startedAt) : initialStatus === 'RUNNING' ? now : null;
    const completedAt = data.completedAt
      ? new Date(data.completedAt)
      : initialStatus === 'SUCCESSFUL' || initialStatus === 'FAILED'
      ? now
      : null;

    return await pgDb.transaction(async (client) => {
      // 1. Insert Deployment
      await client.query(
        `INSERT INTO deployments (id, project_id, environment, version, commit_sha, branch, triggered_by_id, status, started_at, completed_at, occurred_at, ingested_at, build_url, commit_url, release_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);`,
        [
          depId,
          projectId,
          data.environment,
          data.version,
          data.commitSha,
          data.branch,
          userId,
          initialStatus,
          startedAt,
          completedAt,
          occurredAt,
          now,
          data.buildUrl || null,
          data.commitUrl || null,
          data.releaseNotes || null,
          now,
          now,
        ]
      );

      // 2. Insert initial status history
      await client.query(
        `INSERT INTO deployment_status_history (id, deployment_id, from_status, to_status, changed_by_id, note, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [historyId, depId, null, initialStatus, userId, 'Initial deployment registered.', now]
      );

      // 3. Create Timeline Event
      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          eventId,
          projectId,
          'DEPLOYMENT_CREATED',
          `Deployment ${data.version} (${data.environment}) Initiated`,
          `Commit ${data.commitSha.substring(0, 7)} on branch ${data.branch}.`,
          JSON.stringify({
            version: data.version,
            commitSha: data.commitSha,
            branch: data.branch,
            environment: data.environment,
            status: initialStatus,
          }),
          depId,
          'DEPLOYMENT',
          occurredAt,
          now,
          now,
        ]
      );

      // 4. Create Audit Log
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, project_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          auditId,
          userId,
          'DEPLOYMENT_CREATE',
          'DEPLOYMENT',
          depId,
          JSON.stringify({ version: data.version, environment: data.environment, status: initialStatus }),
          projectId,
          now,
        ]
      );

      return {
        id: depId,
        projectId,
        environment: data.environment,
        version: data.version,
        commitSha: data.commitSha,
        branch: data.branch,
        triggeredById: userId,
        status: initialStatus,
        startedAt,
        completedAt,
        occurredAt,
        ingestedAt: now,
        buildUrl: data.buildUrl || null,
        commitUrl: data.commitUrl || null,
        releaseNotes: data.releaseNotes || null,
        createdAt: now,
        updatedAt: now,
      };
    });

    realtimeService.publish(projectId, {
      type: 'DEPLOYMENT_CREATED',
      deploymentId: depId,
      version: data.version,
      environment: data.environment,
      status: initialStatus,
    });

    return result;
  }

  async updateDeploymentStatus(userId: string, id: string, newStatus: DeploymentStatus, note?: string) {
    const depRows = await pgDb.query<any>('SELECT * FROM deployments WHERE id = $1 LIMIT 1;', [id]);
    if (depRows.length === 0) throw new AppError('Deployment not found', 404);

    const dep = depRows[0];
    const fromStatus = dep.status;
    if (fromStatus === newStatus) return dep;

    const now = new Date();
    const historyId = `dsh_${uuidv4().substring(0, 8)}`;
    const eventId = `tle_${uuidv4().substring(0, 8)}`;
    const auditId = `aud_${uuidv4().substring(0, 8)}`;

    const completedAt =
      (newStatus === 'SUCCESSFUL' || newStatus === 'FAILED' || newStatus === 'ROLLED_BACK') && !dep.completed_at
        ? now
        : dep.completed_at;

    const startedAt = newStatus === 'RUNNING' && !dep.started_at ? now : dep.started_at;

    return await pgDb.transaction(async (client) => {
      // 1. Update status
      await client.query(
        `UPDATE deployments
         SET status = $1, started_at = $2, completed_at = $3, updated_at = $4
         WHERE id = $5;`,
        [newStatus, startedAt, completedAt, now, id]
      );

      // 2. Insert into history
      await client.query(
        `INSERT INTO deployment_status_history (id, deployment_id, from_status, to_status, changed_by_id, note, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [historyId, id, fromStatus, newStatus, userId, note || `Status transitioned to ${newStatus}`, now]
      );

      // 3. Create Timeline Event
      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          eventId,
          dep.project_id,
          'DEPLOYMENT_STATUS_CHANGED',
          `Deployment ${dep.version} Status: ${newStatus}`,
          note || `Deployment transitioned from ${fromStatus} to ${newStatus}.`,
          JSON.stringify({ deploymentId: id, version: dep.version, fromStatus, toStatus: newStatus, note }),
          id,
          'DEPLOYMENT',
          now,
          now,
          now,
        ]
      );

      // 4. Create Audit Log
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, project_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [auditId, userId, 'DEPLOYMENT_STATUS_UPDATE', 'DEPLOYMENT', id, JSON.stringify({ fromStatus, toStatus: newStatus, note }), dep.project_id, now]
      );

      return {
        ...dep,
        status: newStatus,
        startedAt,
        completedAt,
        updatedAt: now,
      };
    });

    realtimeService.publish(dep.project_id, {
      type: 'DEPLOYMENT_STATUS_CHANGED',
      deploymentId: id,
      version: dep.version,
      fromStatus,
      toStatus: newStatus,
    });

    return result;
  }
}

export const deploymentService = new DeploymentService();
