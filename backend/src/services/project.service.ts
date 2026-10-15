import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { Project, ProjectRole, ProjectStatus, Environment } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ProjectService {
  async listProjects(userId: string) {
    const userRows = await pgDb.query<{ role: string }>('SELECT role FROM users WHERE id = $1 LIMIT 1;', [userId]);
    if (userRows.length === 0) throw new AppError('User not found', 404);

    const isSystemAdmin = userRows[0].role === 'ADMIN';

    let sql = '';
    let params: any[] = [];

    if (isSystemAdmin) {
      sql = `
        SELECT p.*,
          COALESCE(pm.role, 'ADMIN') as role,
          (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as "memberCount",
          (SELECT COUNT(*) FROM deployments WHERE project_id = p.id) as "deploymentCount",
          (SELECT COUNT(*) FROM incidents WHERE project_id = p.id AND status NOT IN ('RESOLVED', 'CLOSED')) as "incidentCount"
        FROM projects p
        LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
        ORDER BY p.created_at DESC;
      `;
      params = [userId];
    } else {
      sql = `
        SELECT p.*,
          pm.role as role,
          (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as "memberCount",
          (SELECT COUNT(*) FROM deployments WHERE project_id = p.id) as "deploymentCount",
          (SELECT COUNT(*) FROM incidents WHERE project_id = p.id AND status NOT IN ('RESOLVED', 'CLOSED')) as "incidentCount"
        FROM projects p
        INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
        ORDER BY p.created_at DESC;
      `;
      params = [userId];
    }

    const rows = await pgDb.query<any>(sql, params);
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      repoUrl: p.repo_url,
      environment: p.environment,
      status: p.status,
      role: p.role,
      memberCount: parseInt(p.memberCount, 10) || 0,
      deploymentCount: parseInt(p.deploymentCount, 10) || 0,
      incidentCount: parseInt(p.incidentCount, 10) || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  }

  async getProject(userId: string, projectId: string) {
    const projectRows = await pgDb.query<any>('SELECT * FROM projects WHERE id = $1 LIMIT 1;', [projectId]);
    if (projectRows.length === 0) throw new AppError('Project not found', 404);

    const p = projectRows[0];

    // Check user membership / role
    const memberRole = await this.getMemberRole(userId, projectId);
    const userRows = await pgDb.query<{ role: string }>('SELECT role FROM users WHERE id = $1 LIMIT 1;', [userId]);
    const isSystemAdmin = userRows.length > 0 && userRows[0].role === 'ADMIN';

    if (!memberRole && !isSystemAdmin) {
      throw new AppError('Access denied: You are not a member of this project.', 403);
    }

    // Fetch members with user profile
    const membersSql = `
      SELECT pm.id, pm.user_id as "userId", pm.role, pm.joined_at as "joinedAt",
             u.name, u.email, u.avatar_url as "avatarUrl"
      FROM project_members pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at ASC;
    `;
    const membersRows = await pgDb.query<any>(membersSql, [projectId]);

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      repoUrl: p.repo_url,
      environment: p.environment,
      status: p.status,
      role: memberRole || 'ADMIN',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      members: membersRows.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: {
          id: m.userId,
          name: m.name,
          email: m.email,
          avatarUrl: m.avatarUrl,
        },
      })),
    };
  }

  async createProject(userId: string, data: { name: string; description?: string; repoUrl?: string; environment: Environment }) {
    const projectId = `prj_${uuidv4().substring(0, 8)}`;
    const memberId = `mem_${uuidv4().substring(0, 8)}`;
    const eventId = `tle_${uuidv4().substring(0, 8)}`;
    const auditId = `aud_${uuidv4().substring(0, 8)}`;
    const now = new Date();

    return await pgDb.transaction(async (client) => {
      // 1. Insert Project
      await client.query(
        `INSERT INTO projects (id, name, description, repo_url, environment, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [projectId, data.name, data.description || null, data.repoUrl || null, data.environment, 'ACTIVE', now, now]
      );

      // 2. Insert creator as OWNER
      await client.query(
        `INSERT INTO project_members (id, user_id, project_id, role, joined_at)
         VALUES ($1, $2, $3, $4, $5);`,
        [memberId, userId, projectId, 'OWNER', now]
      );

      // 3. Create Timeline Event
      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          eventId,
          projectId,
          'PROJECT_CREATED',
          `Project "${data.name}" Created`,
          `Project initialized for ${data.environment} environment.`,
          JSON.stringify({ createdBy: userId }),
          projectId,
          'PROJECT',
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
          'PROJECT_CREATE',
          'PROJECT',
          projectId,
          JSON.stringify({ name: data.name, environment: data.environment }),
          now,
        ]
      );

      return {
        id: projectId,
        name: data.name,
        description: data.description || null,
        repoUrl: data.repoUrl || null,
        environment: data.environment,
        status: 'ACTIVE' as ProjectStatus,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  async updateProject(
    userId: string,
    projectId: string,
    data: Partial<{ name: string; description: string | null; repoUrl: string | null; environment: Environment; status: ProjectStatus }>
  ) {
    const existing = await pgDb.query<any>('SELECT * FROM projects WHERE id = $1 LIMIT 1;', [projectId]);
    if (existing.length === 0) throw new AppError('Project not found', 404);

    const now = new Date();
    const current = existing[0];

    const updatedName = data.name !== undefined ? data.name : current.name;
    const updatedDesc = data.description !== undefined ? data.description : current.description;
    const updatedRepo = data.repoUrl !== undefined ? data.repoUrl : current.repo_url;
    const updatedEnv = data.environment !== undefined ? data.environment : current.environment;
    const updatedStatus = data.status !== undefined ? data.status : current.status;

    return await pgDb.transaction(async (client) => {
      await client.query(
        `UPDATE projects
         SET name = $1, description = $2, repo_url = $3, environment = $4, status = $5, updated_at = $6
         WHERE id = $7;`,
        [updatedName, updatedDesc, updatedRepo, updatedEnv, updatedStatus, now, projectId]
      );

      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [`aud_${uuidv4().substring(0, 8)}`, userId, 'PROJECT_UPDATE', 'PROJECT', projectId, JSON.stringify(data), now]
      );

      return {
        id: projectId,
        name: updatedName,
        description: updatedDesc,
        repoUrl: updatedRepo,
        environment: updatedEnv,
        status: updatedStatus,
        createdAt: current.created_at,
        updatedAt: now,
      };
    });
  }

  async archiveProject(userId: string, projectId: string) {
    return this.updateProject(userId, projectId, { status: 'ARCHIVED' });
  }

  async getMembers(projectId: string) {
    const membersSql = `
      SELECT pm.id, pm.user_id as "userId", pm.role, pm.joined_at as "joinedAt",
             u.name, u.email, u.avatar_url as "avatarUrl"
      FROM project_members pm
      INNER JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at ASC;
    `;
    const rows = await pgDb.query<any>(membersSql, [projectId]);
    return rows.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: {
        id: m.userId,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
      },
    }));
  }

  async addMember(userId: string, projectId: string, targetEmail: string, role: ProjectRole) {
    const userRows = await pgDb.query<any>('SELECT id, name, email, avatar_url FROM users WHERE lower(email) = lower($1) LIMIT 1;', [targetEmail]);
    if (userRows.length === 0) {
      throw new AppError(`User with email "${targetEmail}" does not exist.`, 404);
    }

    const targetUser = userRows[0];
    const existing = await pgDb.query('SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2;', [projectId, targetUser.id]);
    if (existing.length > 0) {
      throw new AppError('This user is already a member of this project.', 409, 'CONFLICT');
    }

    const memberId = `mem_${uuidv4().substring(0, 8)}`;
    const now = new Date();

    return await pgDb.transaction(async (client) => {
      await client.query(
        `INSERT INTO project_members (id, user_id, project_id, role, joined_at)
         VALUES ($1, $2, $3, $4, $5);`,
        [memberId, targetUser.id, projectId, role, now]
      );

      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          `tle_${uuidv4().substring(0, 8)}`,
          projectId,
          'MEMBER_ADDED',
          `Member Added: ${targetUser.name}`,
          `Assigned role ${role}`,
          JSON.stringify({ addedUserId: targetUser.id, role }),
          memberId,
          'PROJECT_MEMBER',
          now,
          now,
          now,
        ]
      );

      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [`aud_${uuidv4().substring(0, 8)}`, userId, 'MEMBER_ADDED', 'PROJECT_MEMBER', memberId, JSON.stringify({ userEmail: targetEmail, role }), now]
      );

      return {
        id: memberId,
        userId: targetUser.id,
        projectId,
        role,
        joinedAt: now,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          avatarUrl: targetUser.avatar_url,
        },
      };
    });
  }

  async updateMemberRole(userId: string, projectId: string, targetUserId: string, newRole: ProjectRole) {
    const existing = await pgDb.query<any>(
      'SELECT id, role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1;',
      [projectId, targetUserId]
    );

    if (existing.length === 0) throw new AppError('Member not found', 404);

    const oldRole = existing[0].role;
    const now = new Date();

    await pgDb.transaction(async (client) => {
      await client.query('UPDATE project_members SET role = $1 WHERE id = $2;', [newRole, existing[0].id]);
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [`aud_${uuidv4().substring(0, 8)}`, userId, 'MEMBER_ROLE_UPDATED', 'PROJECT_MEMBER', existing[0].id, JSON.stringify({ oldRole, newRole }), now]
      );
    });

    return { id: existing[0].id, userId: targetUserId, projectId, role: newRole };
  }

  async removeMember(userId: string, projectId: string, targetUserId: string) {
    const existing = await pgDb.query<any>(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1;',
      [projectId, targetUserId]
    );

    if (existing.length === 0) throw new AppError('Member not found', 404);

    const now = new Date();
    await pgDb.transaction(async (client) => {
      await client.query('DELETE FROM project_members WHERE id = $1;', [existing[0].id]);
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [`aud_${uuidv4().substring(0, 8)}`, userId, 'MEMBER_REMOVED', 'PROJECT_MEMBER', existing[0].id, JSON.stringify({ removedUserId: targetUserId }), now]
      );
    });

    return { success: true };
  }

  async getMemberRole(userId: string, projectId: string): Promise<ProjectRole | null> {
    const rows = await pgDb.query<{ role: ProjectRole }>(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1;',
      [projectId, userId]
    );
    return rows.length > 0 ? rows[0].role : null;
  }
}

export const projectService = new ProjectService();
