import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/store';
import { AuditLog } from '../types';

export class AuditService {
  async record(userId: string | null, action: string, entityType: string, entityId: string, changes?: any, ipAddress?: string) {
    const log: AuditLog = {
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action,
      entityType,
      entityId,
      changes: changes || null,
      ipAddress: ipAddress || null,
      createdAt: new Date(),
    };
    db.auditLogs.push(log);
    return log;
  }

  async list(filters?: { entityType?: string; entityId?: string }) {
    let logs = [...db.auditLogs];
    if (filters?.entityType) logs = logs.filter((l) => l.entityType === filters.entityType);
    if (filters?.entityId) logs = logs.filter((l) => l.entityId === filters.entityId);

    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return logs.map((l) => {
      const user = l.userId ? db.findUserById(l.userId) : null;
      return {
        ...l,
        user: user ? { id: user.id, name: user.name, email: user.email } : null,
      };
    });
  }
}

export const auditService = new AuditService();
