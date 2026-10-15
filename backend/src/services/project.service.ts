import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/store';
import { Project, ProjectRole, ProjectStatus, Environment } from '../types';

export class ProjectService {
  async listProjects(userId: string) {
    const user = db.findUserById(userId);
    if (!user) throw new Error('User not found');

    // System ADMIN can see all projects
    if (user.role === 'ADMIN') {
      return db.projects.map((p) => {
        const mem = db.projectMembers.find((m) => m.projectId === p.id && m.userId === userId);
        return {
          ...p,
          role: mem ? mem.role : 'ADMIN',
          memberCount: db.projectMembers.filter((m) => m.projectId === p.id).length,
          deploymentCount: db.deployments.filter((d) => d.projectId === p.id).length,
          incidentCount: db.incidents.filter((i) => i.projectId === p.id && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
        };
      });
    }

    const memberships = db.projectMembers.filter((m) => m.userId === userId);
    return memberships
      .map((m) => {
        const project = db.findProjectById(m.projectId);
        if (!project) return null;
        return {
          ...project,
          role: m.role,
          memberCount: db.projectMembers.filter((mem) => mem.projectId === project.id).length,
          deploymentCount: db.deployments.filter((d) => d.projectId === project.id).length,
          incidentCount: db.incidents.filter((i) => i.projectId === project.id && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
        };
      })
      .filter(Boolean);
  }

  async getProject(userId: string, projectId: string) {
    const project = db.findProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const role = db.getProjectMemberRole(userId, projectId);
    const user = db.findUserById(userId);
    if (!role && user?.role !== 'ADMIN') {
      throw new Error('Access denied to this project');
    }

    const members = db.projectMembers
      .filter((m) => m.projectId === projectId)
      .map((m) => {
        const u = db.findUserById(m.userId);
        return {
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: u ? { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl } : null,
        };
      });

    return {
      ...project,
      role: role || 'ADMIN',
      members,
    };
  }

  async createProject(userId: string, data: { name: string; description?: string; repoUrl?: string; environment: Environment }) {
    const project: Project = {
      id: `prj_${uuidv4().substring(0, 8)}`,
      name: data.name,
      description: data.description || null,
      repoUrl: data.repoUrl || null,
      environment: data.environment,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.projects.push(project);

    // Creator becomes OWNER
    db.projectMembers.push({
      id: `mem_${uuidv4().substring(0, 8)}`,
      userId,
      projectId: project.id,
      role: 'OWNER',
      joinedAt: new Date(),
    });

    // Record timeline event
    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId: project.id,
      type: 'PROJECT_CREATED',
      title: `Project "${project.name}" Created`,
      description: `Project initialized for ${project.environment} environment.`,
      metadata: { createdBy: userId },
      entityId: project.id,
      entityType: 'PROJECT',
      occurredAt: new Date(),
      ingestedAt: new Date(),
      createdAt: new Date(),
    });

    // Audit log
    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'PROJECT_CREATE',
      entityType: 'PROJECT',
      entityId: project.id,
      changes: { name: project.name, environment: project.environment },
      createdAt: new Date(),
    });

    return project;
  }

  async updateProject(userId: string, projectId: string, data: Partial<{ name: string; description: string | null; repoUrl: string | null; environment: Environment; status: ProjectStatus }>) {
    const project = db.findProjectById(projectId);
    if (!project) throw new Error('Project not found');

    if (data.name !== undefined) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    if (data.repoUrl !== undefined) project.repoUrl = data.repoUrl;
    if (data.environment !== undefined) project.environment = data.environment;
    if (data.status !== undefined) project.status = data.status;
    project.updatedAt = new Date();

    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'PROJECT_UPDATE',
      entityType: 'PROJECT',
      entityId: project.id,
      changes: data,
      createdAt: new Date(),
    });

    return project;
  }

  async archiveProject(userId: string, projectId: string) {
    return this.updateProject(userId, projectId, { status: 'ARCHIVED' });
  }

  async getMembers(projectId: string) {
    return db.projectMembers
      .filter((m) => m.projectId === projectId)
      .map((m) => {
        const u = db.findUserById(m.userId);
        return {
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: u ? { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl } : null,
        };
      });
  }

  async addMember(userId: string, projectId: string, targetEmail: string, role: ProjectRole) {
    const targetUser = db.findUserByEmail(targetEmail);
    if (!targetUser) {
      throw new Error(`User with email "${targetEmail}" does not exist in the system.`);
    }

    const existing = db.projectMembers.find((m) => m.projectId === projectId && m.userId === targetUser.id);
    if (existing) {
      throw new Error('This user is already a member of this project.');
    }

    const member: ProjectMember = {
      id: `mem_${uuidv4().substring(0, 8)}`,
      userId: targetUser.id,
      projectId,
      role,
      joinedAt: new Date(),
    };

    db.projectMembers.push(member);

    db.timelineEvents.push({
      id: `tle_${uuidv4().substring(0, 8)}`,
      projectId,
      type: 'MEMBER_ADDED',
      title: `Member Added: ${targetUser.name}`,
      description: `Assigned role ${role}`,
      metadata: { addedUserId: targetUser.id, role },
      entityId: member.id,
      entityType: 'PROJECT_MEMBER',
      occurredAt: new Date(),
      ingestedAt: new Date(),
      createdAt: new Date(),
    });

    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'MEMBER_ADDED',
      entityType: 'PROJECT_MEMBER',
      entityId: member.id,
      changes: { userEmail: targetEmail, role },
      createdAt: new Date(),
    });

    return {
      ...member,
      user: { id: targetUser.id, name: targetUser.name, email: targetUser.email, avatarUrl: targetUser.avatarUrl },
    };
  }

  async updateMemberRole(userId: string, projectId: string, targetUserId: string, newRole: ProjectRole) {
    const member = db.projectMembers.find((m) => m.projectId === projectId && m.userId === targetUserId);
    if (!member) throw new Error('Member not found');

    const oldRole = member.role;
    member.role = newRole;

    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'MEMBER_ROLE_UPDATED',
      entityType: 'PROJECT_MEMBER',
      entityId: member.id,
      changes: { oldRole, newRole },
      createdAt: new Date(),
    });

    return member;
  }

  async removeMember(userId: string, projectId: string, targetUserId: string) {
    const index = db.projectMembers.findIndex((m) => m.projectId === projectId && m.userId === targetUserId);
    if (index === -1) throw new Error('Member not found');

    const member = db.projectMembers[index];
    db.projectMembers.splice(index, 1);

    db.auditLogs.push({
      id: `aud_${uuidv4().substring(0, 8)}`,
      userId,
      action: 'MEMBER_REMOVED',
      entityType: 'PROJECT_MEMBER',
      entityId: member.id,
      changes: { removedUserId: targetUserId },
      createdAt: new Date(),
    });

    return { success: true };
  }
}

export const projectService = new ProjectService();
