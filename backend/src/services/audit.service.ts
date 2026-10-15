import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { AuditLog } from '../types';

export class AuditService {
  async record(userId: string | null, action: string, entityType: string, entityId: string, changes?: any, ipAddress?: string) {
    const id = `aud_${uuidv4().substring(0, 8)}`;
    const now = new Date();

    await pgDb.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [id, userId, action, entityType, entityId, changes ? JSON.stringify(changes) : null, ipAddress || null, now]
    );

    return {
      id,
      userId,
      action,
      entityType,
      entityId,
      changes,
      ipAddress: ipAddress || null,
      createdAt: now,
    };
  }

  async list(userId: string, filters?: { entityType?: string; entityId?: string }) {
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
      WHERE (al.user_id = $1 OR al.entity_id = ANY($2))
    `;
    const params: any[] = [userId, authorizedProjectIds];

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
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      changes: l.changes,
      ipAddress: l.ip_address,
      createdAt: l.created_at,
      user: l.user_id ? { id: l.user_id, name: l.userName, email: l.userEmail } : null,
    }));
  }
}

export const auditService = new AuditService();
