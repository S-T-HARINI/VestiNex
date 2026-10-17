import { z } from 'zod';

// ── Auth Schemas ──────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

// ── Project Schemas ───────────────────────────────────────
export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  repoUrl: z.string().url('Invalid repository URL').optional().or(z.literal('')),
  environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']).default('PRODUCTION'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  repoUrl: z.string().url().optional().nullable().or(z.literal('')),
  environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('Valid user email required'),
  role: z.enum(['ADMIN', 'DEVELOPER', 'VIEWER']).default('DEVELOPER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'DEVELOPER', 'VIEWER']),
});

// ── Deployment Schemas ────────────────────────────────────
export const createDeploymentSchema = z.object({
  environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']),
  version: z.string().min(1, 'Version is required'),
  commitSha: z.string().min(7, 'Commit SHA must be at least 7 characters').max(40),
  branch: z.string().min(1, 'Branch is required'),
  status: z.enum(['PENDING', 'RUNNING', 'SUCCESSFUL', 'FAILED', 'ROLLED_BACK']).default('PENDING'),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  occurredAt: z.string().datetime().optional(),
  buildUrl: z.string().url().optional().or(z.literal('')),
  commitUrl: z.string().url().optional().or(z.literal('')),
  releaseNotes: z.string().max(2000).optional(),
});

export const updateDeploymentStatusSchema = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'SUCCESSFUL', 'FAILED', 'ROLLED_BACK']),
  note: z.string().max(500).optional(),
});

// ── Code Change Schemas ───────────────────────────────────
export const createCodeChangeSchema = z.object({
  commitSha: z.string().min(7).max(40),
  message: z.string().min(1, 'Commit message is required'),
  author: z.string().min(1, 'Author is required'),
  branch: z.string().optional(),
  repoUrl: z.string().url().optional().or(z.literal('')),
  committedAt: z.string().datetime(),
  deploymentId: z.string().optional().nullable(),
  pullRequestUrl: z.string().url().optional().or(z.literal('')),
  filesChanged: z.string().optional(),
});

// ── Incident Schemas ──────────────────────────────────────
export const createIncidentSchema = z.object({
  title: z.string().min(3, 'Incident title must be at least 3 characters').max(200),
  description: z.string().max(5000).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  status: z.enum(['OPEN', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'CLOSED']).default('OPEN'),
  assignedToId: z.string().optional().nullable(),
  occurredAt: z.string().datetime().optional(),
  linkedDeploymentId: z.string().optional().nullable(),
  linkConfidence: z.enum(['high', 'medium', 'low']).optional(),
  linkNote: z.string().max(500).optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  assignedToId: z.string().optional().nullable(),
  expectedUpdatedAt: z.string().optional(),
});

export const updateIncidentStatusSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'CLOSED']),
  note: z.string().max(1000).optional(),
  resolutionNote: z.string().max(2000).optional(),
  expectedUpdatedAt: z.string().optional(),
  occurredAt: z.string().optional(),
});

export const assignIncidentSchema = z.object({
  assignedToId: z.string().nullable(),
});

export const linkDeploymentSchema = z.object({
  deploymentId: z.string(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  note: z.string().max(500).optional(),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(3000),
});
