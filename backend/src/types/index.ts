import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export type UserRole = 'ADMIN' | 'USER';
export type ProjectRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';
export type Environment = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
export type DeploymentStatus = 'PENDING' | 'RUNNING' | 'SUCCESSFUL' | 'FAILED' | 'ROLLED_BACK';
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED' | 'CLOSED';

export type TimelineEventType =
  | 'DEPLOYMENT_CREATED'
  | 'DEPLOYMENT_STATUS_CHANGED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_STATUS_CHANGED'
  | 'INCIDENT_ASSIGNED'
  | 'INCIDENT_RESOLVED'
  | 'CODE_CHANGE_RECORDED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'COMMENT_ADDED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  environment: Environment;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  members?: ProjectMember[];
  deployments?: Deployment[];
  incidents?: Incident[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  joinedAt: Date;
  user?: User;
}

export interface Deployment {
  id: string;
  projectId: string;
  environment: Environment;
  version?: string | null;
  commitSha?: string | null;
  branch?: string | null;
  triggeredById?: string | null;
  status: DeploymentStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  occurredAt: Date;
  ingestedAt: Date;
  buildUrl?: string | null;
  commitUrl?: string | null;
  releaseNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  triggeredBy?: User | null;
  codeChanges?: CodeChange[];
  statusHistory?: DeploymentStatusHistory[];
}

export interface DeploymentStatusHistory {
  id: string;
  deploymentId: string;
  fromStatus?: DeploymentStatus | null;
  toStatus: DeploymentStatus;
  changedById?: string | null;
  note?: string | null;
  changedAt: Date;
  changedBy?: User | null;
}

export interface CodeChange {
  id: string;
  projectId: string;
  deploymentId?: string | null;
  commitSha: string;
  message: string;
  author: string;
  branch?: string | null;
  repoUrl?: string | null;
  committedAt: Date;
  pullRequestUrl?: string | null;
  filesChanged?: string | null;
  createdAt: Date;
}

export interface Incident {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedById: string;
  assignedToId?: string | null;
  resolvedAt?: Date | null;
  resolutionNote?: string | null;
  occurredAt: Date;
  ingestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  reportedBy?: User;
  assignedTo?: User | null;
  comments?: Comment[];
  statusHistory?: IncidentStatusHistory[];
  deploymentLinks?: IncidentDeploymentLink[];
}

export interface IncidentStatusHistory {
  id: string;
  incidentId: string;
  fromStatus?: IncidentStatus | null;
  toStatus: IncidentStatus;
  changedById?: string | null;
  note?: string | null;
  changedAt: Date;
  changedBy?: User | null;
}

export interface IncidentDeploymentLink {
  id: string;
  incidentId: string;
  deploymentId: string;
  confidence?: string | null; // "high" | "medium" | "low"
  linkedById?: string | null;
  note?: string | null;
  createdAt: Date;
  deployment?: Deployment;
  linkedBy?: User | null;
}

export interface Comment {
  id: string;
  incidentId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: any;
  entityId?: string | null;
  entityType?: string | null;
  occurredAt: Date;
  ingestedAt: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  ipAddress?: string | null;
  createdAt: Date;
  user?: User | null;
}
