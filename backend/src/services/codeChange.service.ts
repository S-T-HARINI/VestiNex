import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { CodeChange } from '../types';
import { AppError } from '../middleware/errorHandler';

export class CodeChangeService {
  async listCodeChanges(projectId: string) {
    const sql = `
      SELECT cc.*, d.version as "deploymentVersion", d.environment as "deploymentEnvironment", d.status as "deploymentStatus"
      FROM code_changes cc
      LEFT JOIN deployments d ON d.id = cc.deployment_id
      WHERE cc.project_id = $1
      ORDER BY cc.committed_at DESC;
    `;
    const rows = await pgDb.query<any>(sql, [projectId]);

    return rows.map((c) => ({
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
      deployment: c.deployment_id
        ? {
            id: c.deployment_id,
            version: c.deploymentVersion,
            environment: c.deploymentEnvironment,
            status: c.deploymentStatus,
          }
        : null,
    }));
  }

  async getCodeChange(id: string) {
    const rows = await pgDb.query<any>(
      `SELECT cc.*, d.version as "deploymentVersion", d.environment as "deploymentEnvironment", d.status as "deploymentStatus"
       FROM code_changes cc
       LEFT JOIN deployments d ON d.id = cc.deployment_id
       WHERE cc.id = $1 LIMIT 1;`,
      [id]
    );

    if (rows.length === 0) throw new AppError('Code change record not found', 404);
    const c = rows[0];

    return {
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
      deployment: c.deployment_id
        ? {
            id: c.deployment_id,
            version: c.deploymentVersion,
            environment: c.deploymentEnvironment,
            status: c.deploymentStatus,
          }
        : null,
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
    // 1. Verify project exists
    const projRows = await pgDb.query<any>('SELECT id, repo_url FROM projects WHERE id = $1 LIMIT 1;', [projectId]);
    if (projRows.length === 0) throw new AppError('Project not found', 404);

    // 2. Check for duplicate commit SHA within project (HTTP 409 Conflict)
    const existing = await pgDb.query(
      'SELECT id FROM code_changes WHERE project_id = $1 AND commit_sha = $2 LIMIT 1;',
      [projectId, data.commitSha]
    );

    if (existing.length > 0) {
      throw new AppError(
        `Commit SHA ${data.commitSha} has already been recorded for this project. Duplicate event rejected.`,
        409,
        'CONFLICT'
      );
    }

    const now = new Date();
    const committedAt = new Date(data.committedAt);
    const commitId = `commit_${uuidv4().substring(0, 8)}`;
    const eventId = `tle_${uuidv4().substring(0, 8)}`;
    const auditId = `aud_${uuidv4().substring(0, 8)}`;
    const branch = data.branch || 'main';
    const repoUrl = data.repoUrl || projRows[0].repo_url || null;

    return await pgDb.transaction(async (client) => {
      // 3. Insert code change (PostgreSQL UNIQUE constraint `code_changes_commit_sha_project_id_key` enforced)
      await client.query(
        `INSERT INTO code_changes (id, project_id, deployment_id, commit_sha, message, author, branch, repo_url, committed_at, pull_request_url, files_changed, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          commitId,
          projectId,
          data.deploymentId || null,
          data.commitSha,
          data.message,
          data.author,
          branch,
          repoUrl,
          committedAt,
          data.pullRequestUrl || null,
          data.filesChanged || null,
          now,
        ]
      );

      // 4. Create timeline event
      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          eventId,
          projectId,
          'CODE_CHANGE_RECORDED',
          `Commit ${data.commitSha.substring(0, 7)} Pushed`,
          data.message,
          JSON.stringify({
            author: data.author,
            commitSha: data.commitSha,
            branch,
            filesChanged: data.filesChanged,
          }),
          commitId,
          'CODE_CHANGE',
          committedAt,
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
          'CODE_CHANGE_RECORDED',
          'CODE_CHANGE',
          commitId,
          JSON.stringify({ commitSha: data.commitSha, message: data.message }),
          now,
        ]
      );

      return {
        id: commitId,
        projectId,
        deploymentId: data.deploymentId || null,
        commitSha: data.commitSha,
        message: data.message,
        author: data.author,
        branch,
        repoUrl,
        committedAt,
        pullRequestUrl: data.pullRequestUrl || null,
        filesChanged: data.filesChanged || null,
        createdAt: now,
      };
    });
  }
}

export const codeChangeService = new CodeChangeService();
