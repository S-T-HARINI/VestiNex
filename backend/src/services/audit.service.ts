import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { AuditLog } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Sanitizes metadata to strictly ensure sensitive credentials, passwords, tokens,
 * secrets, and session cookies are never logged into persistent audit records.
 */
function sanitizeAuditPayload(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeAuditPayload);

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'password_hash',
    'token',
    'secret',
    'webhookSecret',
    'authorization',
    'cookie',
    'key',
    'signature',
  ];

  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      sanitized[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      sanitized[k] = sanitizeAuditPayload(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export class AuditService {
  async record(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    changes?: any,
    ipAddress?: string,
    projectId?: string | null
  ) {
    const id = `aud_${uuidv4().substring(0, 8)}`;
    const now = new Date();
    const safeChanges = changes ? sanitizeAuditPayload(changes) : null;

    await pgDb.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address, project_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [id, userId, action, entityType, entityId, safeChanges ? JSON.stringify(safeChanges) : null, ipAddress || null, projectId || null, now]
    );

    return {
      id,
      userId,
      projectId: projectId || null,
      action,
      entityType,
      entityId,
      changes: safeChanges,
      ipAddress: ipAddress || null,
      createdAt: now,
    };
  }

  async list(userId: string, filters?: { entityType?: string; entityId?: string; projectId?: string }) {
    // Determine user's authorized projects
    const userProjects = await pgDb.query<{ project_id: string }>(
      'SELECT project_id FROM project_members WHERE user_id = $1;',
      [userId]
    );
    const authorizedProjectIds = userProjects.map((p) => p.project_id);

    let sql = `
      SELECT al.*, u.name as "userName", u.email as "userEmail"
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE (al.project_id = ANY($2) OR al.entity_id = ANY($2) OR al.user_id = $1)
    `;
    const params: any[] = [userId, authorizedProjectIds];

    if (filters?.projectId) {
      // Must be among authorized projects
      if (!authorizedProjectIds.includes(filters.projectId)) {
        throw new AppError('Access denied: You are not a member of this project.', 403);
      }
      params.push(filters.projectId);
      sql += ` AND al.project_id = $${params.length}`;
    }

    if (filters?.entityType) {
      params.push(filters.entityType);
      sql += ` AND al.entity_type = $${params.length}`;
    }
    if (filters?.entityId) {
      params.push(filters.entityId);
      sql += ` AND al.entity_id = $${params.length}`;
    }

    sql += ' ORDER BY al.created_at DESC LIMIT 100;';

    const rows = await pgDb.query<any>(sql, params);
    return rows.map((l) => ({
      id: l.id,
      userId: l.user_id,
      projectId: l.project_id,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      changes: l.changes,
      ipAddress: l.ip_address,
      createdAt: l.created_at,
      user: l.user_id ? { id: l.user_id, name: l.userName, email: l.userEmail } : null,
    }));
  }

  async listByProject(userId: string, projectId: string, filters?: { entityType?: string; entityId?: string }) {
    return this.list(userId, { ...filters, projectId });
  }
}

export const auditService = new AuditService();
