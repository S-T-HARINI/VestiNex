import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { CodeChange } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Safely parses and validates a GitHub repository URL.
 * Strictly prevents SSRF by enforcing https://github.com/ and rejecting
 * custom ports, auth credentials, IP addresses, internal domains, or path traversal.
 */
export function parseGitHubRepoUrl(url: string | null | undefined): { owner: string; repo: string } | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);

    // Protocol must strictly be https:
    if (parsed.protocol !== 'https:') return null;

    // Hostname must strictly be github.com (case insensitive)
    if (parsed.hostname.toLowerCase() !== 'github.com') return null;

    // Reject URLs with ports, usernames, passwords, search params, or hashes
    if (parsed.port || parsed.username || parsed.password) return null;

    // Disallow path traversal sequences
    if (trimmed.includes('..') || trimmed.includes('/./')) return null;

    // Path must follow /:owner/:repo or /:owner/:repo.git
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length !== 2) return null;

    const owner = segments[0];
    let repo = segments[1];

    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }

    // GitHub repository and username rules: alphanumeric, hyphens, underscores, dots
    const validIdentifier = /^[a-zA-Z0-9_.-]+$/;
    if (!validIdentifier.test(owner) || !validIdentifier.test(repo)) return null;

    // Reject directory traversal or empty segments
    if (owner === '.' || owner === '..' || repo === '.' || repo === '..') return null;

    return { owner, repo };
  } catch {
    return null;
  }
}

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

  async syncGitHubCommits(userId: string, projectId: string) {
    // 1. Verify project exists and has repo_url
    const projRows = await pgDb.query<any>(
      'SELECT id, name, repo_url FROM projects WHERE id = $1 LIMIT 1;',
      [projectId]
    );

    if (projRows.length === 0) {
      throw new AppError('Project not found', 404);
    }

    const repoUrl = projRows[0].repo_url;
    if (!repoUrl) {
      throw new AppError(
        'No repository URL configured for this project. Please configure a valid GitHub repository URL in Project Settings.',
        400
      );
    }

    // 2. Validate repository URL (strict SSRF prevention)
    const parsed = parseGitHubRepoUrl(repoUrl);
    if (!parsed) {
      throw new AppError(
        'Invalid GitHub repository URL. Must be in the format https://github.com/:owner/:repo (e.g., https://github.com/expressjs/express)',
        400
      );
    }

    // 3. Fetch recent commits from GitHub REST API (20 commits)
    const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=20`;
    const headers: Record<string, string> = {
      'User-Agent': 'VestiNex-Commit-Sync',
      Accept: 'application/vnd.github.v3+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    let response: globalThis.Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      response = await fetch(apiUrl, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new AppError('GitHub API request timed out after 10 seconds. Please try again.', 504);
      }
      throw new AppError(`Network error while connecting to GitHub API: ${err.message}`, 502);
    }

    if (response.status === 404) {
      throw new AppError(
        `GitHub repository "${parsed.owner}/${parsed.repo}" was not found or is private. Make sure the repository is public or exists.`,
        404
      );
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        throw new AppError(
          'GitHub API rate limit exceeded. Unauthenticated requests are limited to 60/hr. Please wait before syncing again.',
          429
        );
      }
      throw new AppError('GitHub API access was denied. Please verify repository permissions.', 403);
    }

    if (!response.ok) {
      throw new AppError(`GitHub API returned error ${response.status}: ${response.statusText}`, 502);
    }

    let commits: any[];
    try {
      commits = await response.json();
    } catch {
      throw new AppError('Failed to parse response from GitHub API.', 502);
    }

    if (!Array.isArray(commits)) {
      throw new AppError('Unexpected response format from GitHub API.', 502);
    }

    // 4. Ingest commits idempotently into code_changes & record timeline events
    const canonicalRepoUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
    let newlyImported = 0;
    const now = new Date();

    for (const item of commits) {
      const sha = item.sha;
      if (!sha) continue;

      const message = item.commit?.message || 'No commit message';
      const authorName = item.commit?.author?.name;
      const authorEmail = item.commit?.author?.email;
      const author = authorName
        ? authorEmail
          ? `${authorName} <${authorEmail}>`
          : authorName
        : item.author?.login || 'Unknown';
      const committedAt = new Date(item.commit?.author?.date || item.commit?.committer?.date || now);
      const commitId = `commit_${uuidv4().substring(0, 8)}`;
      const eventId = `tle_${uuidv4().substring(0, 8)}`;
      const commitUrl = item.html_url || `${canonicalRepoUrl}/commit/${sha}`;

      // Insert into code_changes using ON CONFLICT DO NOTHING
      const insertResult = await pgDb.query<any>(
        `INSERT INTO code_changes (
           id, project_id, deployment_id, commit_sha, message, author, branch, repo_url, committed_at, pull_request_url, files_changed, created_at
         )
         VALUES ($1, $2, NULL, $3, $4, $5, 'main', $6, $7, $8, NULL, $9)
         ON CONFLICT (commit_sha, project_id) DO NOTHING
         RETURNING id;`,
        [commitId, projectId, sha, message, author, canonicalRepoUrl, committedAt, commitUrl, now]
      );

      // If inserted, record timeline event
      if (insertResult.length > 0) {
        newlyImported++;
        await pgDb.query(
          `INSERT INTO timeline_events (
             id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
          [
            eventId,
            projectId,
            'CODE_CHANGE_RECORDED',
            `Commit ${sha.substring(0, 7)} Pushed`,
            message.split('\n')[0].substring(0, 200),
            JSON.stringify({
              author,
              commitSha: sha,
              repoUrl: canonicalRepoUrl,
              commitUrl,
            }),
            commitId,
            'CODE_CHANGE',
            committedAt,
            now,
            now,
          ]
        );
      }
    }

    // 5. Create audit log if any new commits were imported
    if (newlyImported > 0) {
      const auditId = `aud_${uuidv4().substring(0, 8)}`;
      await pgDb.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          auditId,
          userId,
          'CODE_CHANGES_SYNCED',
          'PROJECT',
          projectId,
          JSON.stringify({
            count: newlyImported,
            totalFetched: commits.length,
            repository: `${parsed.owner}/${parsed.repo}`,
          }),
          now,
        ]
      );
    }

    const updatedList = await this.listCodeChanges(projectId);

    return {
      newlyImported,
      totalFetched: commits.length,
      repository: `${parsed.owner}/${parsed.repo}`,
      message:
        newlyImported > 0
          ? `Successfully imported ${newlyImported} new commit${newlyImported === 1 ? '' : 's'} from ${parsed.owner}/${parsed.repo}.`
          : `All ${commits.length} commits from ${parsed.owner}/${parsed.repo} are already up to date.`,
      codeChanges: updatedList,
    };
  }
}

export const codeChangeService = new CodeChangeService();
