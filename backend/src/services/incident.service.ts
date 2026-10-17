import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { Incident, IncidentSeverity, IncidentStatus, IncidentDeploymentLink, Comment } from '../types';
import { AppError } from '../middleware/errorHandler';

export class IncidentService {
  async listIncidents(projectId: string, filters?: { severity?: IncidentSeverity; status?: IncidentStatus }) {
    let sql = `
      SELECT i.*,
        u_rep.name as "reportedByName", u_rep.email as "reportedByEmail", u_rep.avatar_url as "reportedByAvatar",
        u_ass.name as "assignedToName", u_ass.email as "assignedToEmail", u_ass.avatar_url as "assignedToAvatar",
        (SELECT COUNT(*) FROM comments WHERE incident_id = i.id) as "commentCount",
        (SELECT COUNT(*) FROM incident_deployment_links WHERE incident_id = i.id) as "linkedDeploymentCount"
      FROM incidents i
      LEFT JOIN users u_rep ON u_rep.id = i.reported_by_id
      LEFT JOIN users u_ass ON u_ass.id = i.assigned_to_id
      WHERE i.project_id = $1
    `;
    const params: any[] = [projectId];

    if (filters?.severity) {
      params.push(filters.severity);
      sql += ` AND i.severity = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND i.status = $${params.length}`;
    }

    sql += ' ORDER BY i.occurred_at DESC;';

    const rows = await pgDb.query<any>(sql, params);
    return rows.map((inc) => ({
      id: inc.id,
      projectId: inc.project_id,
      title: inc.title,
      description: inc.description,
      severity: inc.severity,
      status: inc.status,
      reportedById: inc.reported_by_id,
      assignedToId: inc.assigned_to_id,
      resolvedAt: inc.resolved_at,
      resolutionNote: inc.resolution_note,
      occurredAt: inc.occurred_at,
      ingestedAt: inc.ingested_at,
      createdAt: inc.created_at,
      updatedAt: inc.updated_at,
      reportedBy: inc.reported_by_id
        ? { id: inc.reported_by_id, name: inc.reportedByName, email: inc.reportedByEmail, avatarUrl: inc.reportedByAvatar }
        : null,
      assignedTo: inc.assigned_to_id
        ? { id: inc.assigned_to_id, name: inc.assignedToName, email: inc.assignedToEmail, avatarUrl: inc.assignedToAvatar }
        : null,
      commentCount: parseInt(inc.commentCount, 10) || 0,
      linkedDeploymentCount: parseInt(inc.linkedDeploymentCount, 10) || 0,
    }));
  }

  async getIncident(id: string) {
    const incRows = await pgDb.query<any>(
      `SELECT i.*,
        u_rep.name as "reportedByName", u_rep.email as "reportedByEmail", u_rep.avatar_url as "reportedByAvatar",
        u_ass.name as "assignedToName", u_ass.email as "assignedToEmail", u_ass.avatar_url as "assignedToAvatar"
       FROM incidents i
       LEFT JOIN users u_rep ON u_rep.id = i.reported_by_id
       LEFT JOIN users u_ass ON u_ass.id = i.assigned_to_id
       WHERE i.id = $1 LIMIT 1;`,
      [id]
    );

    if (incRows.length === 0) throw new AppError('Incident not found', 404);
    const inc = incRows[0];

    // Comments
    const commentRows = await pgDb.query<any>(
      `SELECT c.*, u.name as "userName", u.email as "userEmail", u.avatar_url as "userAvatar"
       FROM comments c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.incident_id = $1
       ORDER BY c.created_at ASC;`,
      [id]
    );

    // Status history
    const historyRows = await pgDb.query<any>(
      `SELECT ish.*, u.name as "changedByName", u.email as "changedByEmail"
       FROM incident_status_history ish
       LEFT JOIN users u ON u.id = ish.changed_by_id
       WHERE ish.incident_id = $1
       ORDER BY ish.changed_at ASC;`,
      [id]
    );

    // Deployment links
    const linkRows = await pgDb.query<any>(
      `SELECT idl.*, d.version, d.environment, d.commit_sha as "commitSha", d.branch,
              u.name as "linkedByName"
       FROM incident_deployment_links idl
       INNER JOIN deployments d ON d.id = idl.deployment_id
       LEFT JOIN users u ON u.id = idl.linked_by_id
       WHERE idl.incident_id = $1;`,
      [id]
    );

    // Compute candidate correlations
    const candidateDeployments = await pgDb.query<any>(
      'SELECT * FROM deployments WHERE project_id = $1 ORDER BY occurred_at DESC;',
      [inc.project_id]
    );

    const linkedDepIds = new Set(linkRows.map((l: any) => l.deployment_id));
    const incOccurredTime = new Date(inc.occurred_at).getTime();

    const suggestedCorrelations = candidateDeployments
      .map((dep: any) => {
        const depTime = new Date(dep.completed_at || dep.occurred_at).getTime();
        const diffMs = incOccurredTime - depTime;
        const diffMinutes = Math.round(diffMs / 60000);

        const isLinked = linkedDepIds.has(dep.id);

        let confidence: 'high' | 'medium' | 'low' = 'low';
        let rationale = '';

        if (diffMinutes >= 0 && diffMinutes <= 120) {
          confidence = 'high';
          rationale = `Temporal proximity: Deployment finished ${diffMinutes}m before incident onset. High investigative priority. Note: Correlation provides investigative signal; causation requires commit diff verification.`;
        } else if (diffMinutes > 120 && diffMinutes <= 1440) {
          confidence = 'medium';
          rationale = `Temporal proximity: Deployment completed ${Math.round(diffMinutes / 60)}h before incident onset. Intermediate investigative lead.`;
        } else if (diffMinutes > 1440 && diffMinutes <= 4320) {
          confidence = 'low';
          rationale = `Temporal distance: Deployment finished ${Math.round(diffMinutes / 1440)}d before incident. Lower baseline probability unless delayed trigger.`;
        } else {
          return null;
        }

        return {
          deployment: {
            id: dep.id,
            version: dep.version,
            environment: dep.environment,
            commitSha: dep.commit_sha,
            branch: dep.branch,
            occurredAt: dep.occurred_at,
            completedAt: dep.completed_at,
            releaseNotes: dep.release_notes,
          },
          confidence,
          diffMinutes,
          rationale,
          isLinked,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.diffMinutes - b.diffMinutes);

    return {
      id: inc.id,
      projectId: inc.project_id,
      title: inc.title,
      description: inc.description,
      severity: inc.severity,
      status: inc.status,
      reportedById: inc.reported_by_id,
      assignedToId: inc.assigned_to_id,
      resolvedAt: inc.resolved_at,
      resolutionNote: inc.resolution_note,
      occurredAt: inc.occurred_at,
      ingestedAt: inc.ingested_at,
      createdAt: inc.created_at,
      updatedAt: inc.updated_at,
      reportedBy: inc.reported_by_id
        ? { id: inc.reported_by_id, name: inc.reportedByName, email: inc.reportedByEmail, avatarUrl: inc.reportedByAvatar }
        : null,
      assignedTo: inc.assigned_to_id
        ? { id: inc.assigned_to_id, name: inc.assignedToName, email: inc.assignedToEmail, avatarUrl: inc.assignedToAvatar }
        : null,
      comments: commentRows.map((c) => ({
        id: c.id,
        incidentId: c.incident_id,
        userId: c.user_id,
        content: c.content,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        user: { id: c.user_id, name: c.userName, email: c.userEmail, avatarUrl: c.userAvatar },
      })),
      statusHistory: historyRows.map((h) => ({
        id: h.id,
        incidentId: h.incident_id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        changedById: h.changed_by_id,
        note: h.note,
        changedAt: h.changed_at,
        changedBy: h.changed_by_id ? { id: h.changed_by_id, name: h.changedByName, email: h.changedByEmail } : null,
      })),
      deploymentLinks: linkRows.map((l) => ({
        id: l.id,
        incidentId: l.incident_id,
        deploymentId: l.deployment_id,
        confidence: l.confidence,
        note: l.note,
        createdAt: l.created_at,
        deployment: {
          id: l.deployment_id,
          version: l.version,
          environment: l.environment,
          commitSha: l.commitSha,
          branch: l.branch,
        },
        linkedBy: l.linked_by_id ? { id: l.linked_by_id, name: l.linkedByName } : null,
      })),
      suggestedCorrelations,
    };
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
    const projRows = await pgDb.query('SELECT id FROM projects WHERE id = $1 LIMIT 1;', [projectId]);
    if (projRows.length === 0) throw new AppError('Project not found', 404);

    const targetAssigneeId = data.assignedToId && data.assignedToId.trim() ? data.assignedToId.trim() : null;
    if (targetAssigneeId) {
      const memberRows = await pgDb.query<any>(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1;',
        [projectId, targetAssigneeId]
      );
      if (memberRows.length === 0) {
        throw new AppError('The assigned user must be an active member of this project workspace.', 400, 'INVALID_ASSIGNEE');
      }
    }

    const now = new Date();
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : now;
    const initialStatus = data.status || 'OPEN';
    const incId = `inc_${uuidv4().substring(0, 8)}`;
    const historyId = `ish_${uuidv4().substring(0, 8)}`;
    const eventId = `tle_${uuidv4().substring(0, 8)}`;
    const auditId = `aud_${uuidv4().substring(0, 8)}`;

    return await pgDb.transaction(async (client) => {
      // 1. Insert Incident
      await client.query(
        `INSERT INTO incidents (id, project_id, title, description, severity, status, reported_by_id, assigned_to_id, resolved_at, resolution_note, occurred_at, ingested_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
        [
          incId,
          projectId,
          data.title,
          data.description || null,
          data.severity,
          initialStatus,
          userId,
          targetAssigneeId,
          initialStatus === 'RESOLVED' || initialStatus === 'CLOSED' ? now : null,
          null,
          occurredAt,
          now,
          now,
          now,
        ]
      );

      // 2. Insert initial status history
      await client.query(
        `INSERT INTO incident_status_history (id, incident_id, from_status, to_status, changed_by_id, note, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [historyId, incId, null, initialStatus, userId, 'Incident registered.', now]
      );

      // 3. Link deployment if requested
      if (data.linkedDeploymentId) {
        await client.query(
          `INSERT INTO incident_deployment_links (id, incident_id, deployment_id, confidence, linked_by_id, note, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [
            `idl_${uuidv4().substring(0, 8)}`,
            incId,
            data.linkedDeploymentId,
            data.linkConfidence || 'medium',
            userId,
            data.linkNote || 'Associated during incident creation.',
            now,
          ]
        );
      }

      // 4. Create timeline event
      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          eventId,
          projectId,
          'INCIDENT_CREATED',
          `${data.severity} Incident: ${data.title}`,
          data.description || 'Incident reported.',
          JSON.stringify({ severity: data.severity, status: initialStatus, assignedToId: data.assignedToId }),
          incId,
          'INCIDENT',
          occurredAt,
          now,
          now,
        ]
      );

      // 5. Create audit log
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          auditId,
          userId,
          'INCIDENT_CREATE',
          'INCIDENT',
          incId,
          JSON.stringify({ title: data.title, severity: data.severity, status: initialStatus }),
          now,
        ]
      );

      return {
        id: incId,
        projectId,
        title: data.title,
        description: data.description || null,
        severity: data.severity,
        status: initialStatus,
        reportedById: userId,
        assignedToId: data.assignedToId || null,
        resolvedAt: null,
        resolutionNote: null,
        occurredAt,
        ingestedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  async updateIncident(
    userId: string,
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      severity: IncidentSeverity;
      assignedToId: string | null;
      expectedUpdatedAt?: string;
    }>
  ) {
    const incRows = await pgDb.query<any>('SELECT * FROM incidents WHERE id = $1 LIMIT 1;', [id]);
    if (incRows.length === 0) throw new AppError('Incident not found', 404);
    const inc = incRows[0];

    // Concurrency check for simultaneous updates
    if (data.expectedUpdatedAt) {
      const currentEpoch = new Date(inc.updated_at).getTime();
      const expectedEpoch = new Date(data.expectedUpdatedAt).getTime();
      if (Math.abs(currentEpoch - expectedEpoch) > 1000) {
        throw new AppError(
          'Concurrent edit conflict: The incident was updated by another team member. Please refresh and review the latest changes.',
          409,
          'CONFLICT'
        );
      }
    }

    const targetAssigneeId = data.assignedToId !== undefined
      ? (data.assignedToId && data.assignedToId.trim() ? data.assignedToId.trim() : null)
      : inc.assigned_to_id;

    if (targetAssigneeId && targetAssigneeId !== inc.assigned_to_id) {
      const memberRows = await pgDb.query<any>(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1;',
        [inc.project_id, targetAssigneeId]
      );
      if (memberRows.length === 0) {
        throw new AppError('The assigned user must be an active member of this project workspace.', 400, 'INVALID_ASSIGNEE');
      }
    }

    const now = new Date();
    const updatedTitle = data.title !== undefined ? data.title : inc.title;
    const updatedDesc = data.description !== undefined ? data.description : inc.description;
    const updatedSeverity = data.severity !== undefined ? data.severity : inc.severity;
    const updatedAssignee = targetAssigneeId;

    return await pgDb.transaction(async (client) => {
      await client.query(
        `UPDATE incidents
         SET title = $1, description = $2, severity = $3, assigned_to_id = $4, updated_at = $5
         WHERE id = $6;`,
        [updatedTitle, updatedDesc, updatedSeverity, updatedAssignee, now, id]
      );

      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [`aud_${uuidv4().substring(0, 8)}`, userId, 'INCIDENT_UPDATE', 'INCIDENT', id, JSON.stringify(data), now]
      );

      return {
        ...inc,
        title: updatedTitle,
        description: updatedDesc,
        severity: updatedSeverity,
        assignedToId: updatedAssignee,
        updatedAt: now,
      };
    });
  }

  async updateIncidentStatus(
    userId: string,
    id: string,
    newStatus: IncidentStatus,
    note?: string,
    resolutionNote?: string,
    expectedUpdatedAt?: string
  ) {
    const incRows = await pgDb.query<any>('SELECT * FROM incidents WHERE id = $1 LIMIT 1;', [id]);
    if (incRows.length === 0) throw new AppError('Incident not found', 404);
    const inc = incRows[0];

    // Concurrency detection for simultaneous incident updates
    if (expectedUpdatedAt) {
      const currentEpoch = new Date(inc.updated_at).getTime();
      const expectedEpoch = new Date(expectedUpdatedAt).getTime();
      if (Math.abs(currentEpoch - expectedEpoch) > 1000) {
        throw new AppError(
          'Concurrent edit conflict: The incident was updated by another team member. Please refresh and review the latest changes.',
          409,
          'CONFLICT'
        );
      }
    }

    const fromStatus = inc.status;
    const now = new Date();
    const isResolved = newStatus === 'RESOLVED' || newStatus === 'CLOSED';
    const resolvedAt = isResolved ? (inc.resolved_at || now) : null;
    const finalResolutionNote = resolutionNote || inc.resolution_note || null;

    const historyId = `ish_${uuidv4().substring(0, 8)}`;
    const eventId = `tle_${uuidv4().substring(0, 8)}`;
    const auditId = `aud_${uuidv4().substring(0, 8)}`;

    return await pgDb.transaction(async (client) => {
      // 1. Update incident table
      await client.query(
        `UPDATE incidents
         SET status = $1, resolved_at = $2, resolution_note = $3, updated_at = $4
         WHERE id = $5;`,
        [newStatus, resolvedAt, finalResolutionNote, now, id]
      );

      // 2. Insert into incident status history
      await client.query(
        `INSERT INTO incident_status_history (id, incident_id, from_status, to_status, changed_by_id, note, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [historyId, id, fromStatus, newStatus, userId, note || `Status transitioned to ${newStatus}`, now]
      );

      // 3. Create Timeline Event
      const eventType = newStatus === 'RESOLVED' ? 'INCIDENT_RESOLVED' : 'INCIDENT_STATUS_CHANGED';
      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          eventId,
          inc.project_id,
          eventType,
          `Incident Status: ${newStatus}`,
          note || `Transitioned from ${fromStatus} to ${newStatus}.`,
          JSON.stringify({ incidentId: id, fromStatus, toStatus: newStatus, note, resolutionNote: finalResolutionNote }),
          id,
          'INCIDENT',
          now,
          now,
          now,
        ]
      );

      // 4. Create Audit Log
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          auditId,
          userId,
          'INCIDENT_STATUS_UPDATE',
          'INCIDENT',
          id,
          JSON.stringify({ fromStatus, toStatus: newStatus, note, resolutionNote: finalResolutionNote }),
          now,
        ]
      );

      return {
        ...inc,
        status: newStatus,
        resolvedAt,
        resolutionNote: finalResolutionNote,
        updatedAt: now,
      };
    });
  }

  async assignIncident(userId: string, id: string, assignedToId: string | null) {
    const incRows = await pgDb.query<any>('SELECT * FROM incidents WHERE id = $1 LIMIT 1;', [id]);
    if (incRows.length === 0) throw new AppError('Incident not found', 404);
    const inc = incRows[0];

    const now = new Date();
    const eventId = `tle_${uuidv4().substring(0, 8)}`;
    const auditId = `aud_${uuidv4().substring(0, 8)}`;

    const targetAssigneeId = assignedToId && assignedToId.trim() ? assignedToId.trim() : null;
    let assigneeName = 'Unassigned';
    if (targetAssigneeId) {
      const memberRows = await pgDb.query<any>(
        `SELECT u.id, u.name, u.email
         FROM project_members pm
         INNER JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1 AND pm.user_id = $2 LIMIT 1;`,
        [inc.project_id, targetAssigneeId]
      );
      if (memberRows.length === 0) {
        throw new AppError('The assigned user must be an active member of this project workspace.', 400, 'INVALID_ASSIGNEE');
      }
      assigneeName = memberRows[0].name;
    }

    return await pgDb.transaction(async (client) => {
      await client.query('UPDATE incidents SET assigned_to_id = $1, updated_at = $2 WHERE id = $3;', [targetAssigneeId, now, id]);

      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          eventId,
          inc.project_id,
          'INCIDENT_ASSIGNED',
          `Incident Assigned to ${assigneeName}`,
          'Ownership assigned for incident investigation.',
          JSON.stringify({ assignedToId: targetAssigneeId, previousAssignee: inc.assigned_to_id }),
          id,
          'INCIDENT',
          now,
          now,
          now,
        ]
      );

      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [auditId, userId, 'INCIDENT_ASSIGNMENT', 'INCIDENT', id, JSON.stringify({ previousAssignee: inc.assigned_to_id, assignedToId: targetAssigneeId }), now]
      );

      return {
        ...inc,
        assignedToId: targetAssigneeId,
        updatedAt: now,
      };
    });
  }

  async linkDeployment(userId: string, incidentId: string, deploymentId: string, confidence: 'high' | 'medium' | 'low', note?: string) {
    const incRows = await pgDb.query('SELECT project_id FROM incidents WHERE id = $1 LIMIT 1;', [incidentId]);
    if (incRows.length === 0) throw new AppError('Incident not found', 404);

    const depRows = await pgDb.query('SELECT id FROM deployments WHERE id = $1 LIMIT 1;', [deploymentId]);
    if (depRows.length === 0) throw new AppError('Deployment not found', 404);

    const existing = await pgDb.query<any>(
      'SELECT id FROM incident_deployment_links WHERE incident_id = $1 AND deployment_id = $2 LIMIT 1;',
      [incidentId, deploymentId]
    );

    const now = new Date();
    const linkId = existing.length > 0 ? existing[0].id : `idl_${uuidv4().substring(0, 8)}`;

    return await pgDb.transaction(async (client) => {
      if (existing.length > 0) {
        await client.query(
          `UPDATE incident_deployment_links SET confidence = $1, note = $2, linked_by_id = $3 WHERE id = $4;`,
          [confidence, note || null, userId, linkId]
        );
      } else {
        await client.query(
          `INSERT INTO incident_deployment_links (id, incident_id, deployment_id, confidence, linked_by_id, note, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [linkId, incidentId, deploymentId, confidence, userId, note || null, now]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [`aud_${uuidv4().substring(0, 8)}`, userId, 'INCIDENT_DEPLOYMENT_LINK', 'INCIDENT', incidentId, JSON.stringify({ deploymentId, confidence, note }), now]
      );

      return {
        id: linkId,
        incidentId,
        deploymentId,
        confidence,
        linkedById: userId,
        note: note || null,
        createdAt: now,
      };
    });
  }

  async unlinkDeployment(userId: string, incidentId: string, deploymentId: string) {
    const existing = await pgDb.query(
      'SELECT id FROM incident_deployment_links WHERE incident_id = $1 AND deployment_id = $2 LIMIT 1;',
      [incidentId, deploymentId]
    );

    if (existing.length === 0) throw new AppError('Link not found', 404);

    const now = new Date();
    await pgDb.transaction(async (client) => {
      await client.query('DELETE FROM incident_deployment_links WHERE incident_id = $1 AND deployment_id = $2;', [incidentId, deploymentId]);

      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [`aud_${uuidv4().substring(0, 8)}`, userId, 'INCIDENT_DEPLOYMENT_UNLINK', 'INCIDENT', incidentId, JSON.stringify({ deploymentId }), now]
      );
    });

    return { success: true };
  }

  async addComment(userId: string, incidentId: string, content: string) {
    const incRows = await pgDb.query<any>('SELECT project_id FROM incidents WHERE id = $1 LIMIT 1;', [incidentId]);
    if (incRows.length === 0) throw new AppError('Incident not found', 404);

    const commentId = `cmt_${uuidv4().substring(0, 8)}`;
    const eventId = `tle_${uuidv4().substring(0, 8)}`;
    const now = new Date();

    return await pgDb.transaction(async (client) => {
      await client.query(
        `INSERT INTO comments (id, incident_id, user_id, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [commentId, incidentId, userId, content, now.toISOString(), now.toISOString()]
      );

      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          eventId,
          incRows[0].project_id,
          'COMMENT_ADDED',
          'Investigation Comment Added',
          content.length > 80 ? `${content.substring(0, 80)}...` : content,
          JSON.stringify({ incidentId, commentId }),
          commentId,
          'COMMENT',
          now.toISOString(),
          now.toISOString(),
          now.toISOString(),
        ]
      );

      const userRows = await client.query<any>('SELECT id, name, email, avatar_url FROM users WHERE id = $1;', [userId]);
      const user = userRows[0];

      return {
        id: commentId,
        incidentId,
        userId,
        content,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        user: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url } : null,
      };
    });
  }

  async getComments(incidentId: string) {
    const rows = await pgDb.query<any>(
      `SELECT c.*, u.name as "userName", u.email as "userEmail", u.avatar_url as "userAvatar"
       FROM comments c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.incident_id = $1
       ORDER BY c.created_at ASC;`,
      [incidentId]
    );

    return rows.map((c) => ({
      id: c.id,
      incidentId: c.incident_id,
      userId: c.user_id,
      content: c.content,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      user: { id: c.user_id, name: c.userName, email: c.userEmail, avatarUrl: c.userAvatar },
    }));
  }

  async getHistory(incidentId: string) {
    const rows = await pgDb.query<any>(
      `SELECT ish.*, u.name as "changedByName", u.email as "changedByEmail"
       FROM incident_status_history ish
       LEFT JOIN users u ON u.id = ish.changed_by_id
       WHERE ish.incident_id = $1
       ORDER BY ish.changed_at ASC;`,
      [incidentId]
    );

    return rows.map((h) => ({
      id: h.id,
      incidentId: h.incident_id,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      changedById: h.changed_by_id,
      note: h.note,
      changedAt: h.changed_at,
      changedBy: h.changed_by_id ? { id: h.changed_by_id, name: h.changedByName, email: h.changedByEmail } : null,
    }));
  }
}

export const incidentService = new IncidentService();
