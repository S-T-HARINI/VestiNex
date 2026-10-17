import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { pgDb } from '../lib/postgres';
import { auditService } from './audit.service';
import { realtimeService } from './realtime.service';
import { parseGitHubRepoUrl } from './codeChange.service';

export interface WebhookProcessResult {
  success: boolean;
  event: string;
  deliveryId: string;
  deduplicated?: boolean;
  projectId?: string | null;
  message: string;
  details?: any;
}

export class WebhookService {
  /**
   * Verifies the GitHub HMAC SHA-256 webhook signature.
   * Uses crypto.timingSafeEqual to prevent timing attacks.
   */
  verifySignature(rawBody: Buffer | string | undefined, signatureHeader: string | undefined, secret: string | undefined): boolean {
    if (!secret) {
      // If secret is not configured in environment, skip signature check if none was sent,
      // or reject if secret is required. In production with a secret set, verification is mandatory.
      return true;
    }

    if (!signatureHeader || !rawBody) {
      return false;
    }

    const trimmed = signatureHeader.trim();
    if (!trimmed.startsWith('sha256=')) {
      return false;
    }

    const signatureHex = trimmed.substring(7);
    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');

    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(bodyBuffer)
      .digest('hex');

    const sigBuf = Buffer.from(signatureHex, 'hex');
    const expBuf = Buffer.from(expectedHex, 'hex');

    if (sigBuf.length !== expBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  /**
   * Checks whether a webhook delivery has already been processed (database-level deduplication).
   */
  async isDeliveryProcessed(deliveryId: string): Promise<boolean> {
    const rows = await pgDb.query<{ id: string }>(
      'SELECT id FROM webhook_deliveries WHERE delivery_id = $1 LIMIT 1;',
      [deliveryId]
    );
    return rows.length > 0;
  }

  /**
   * Records a webhook delivery in the database to guarantee idempotency.
   */
  async recordDelivery(
    deliveryId: string,
    eventType: string,
    projectId: string | null,
    status = 'PROCESSED',
    payloadHash?: string
  ): Promise<void> {
    const id = `whd_${uuidv4().substring(0, 8)}`;
    await pgDb.query(
      `INSERT INTO webhook_deliveries (id, delivery_id, event_type, project_id, payload_hash, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (delivery_id) DO NOTHING;`,
      [id, deliveryId, eventType, projectId, payloadHash || null, status, new Date()]
    );
  }

  /**
   * Identifies the project corresponding to an incoming GitHub repository payload.
   */
  async findProjectForRepository(repoPayload: any): Promise<{ id: string; name: string; repoUrl: string } | null> {
    if (!repoPayload) return null;

    const urlsToTest: string[] = [
      repoPayload.html_url,
      repoPayload.clone_url,
      repoPayload.git_url,
      repoPayload.ssh_url,
      repoPayload.url,
    ].filter(Boolean);

    // If repository has full_name e.g. "expressjs/express"
    let parsedIncoming: { owner: string; repo: string } | null = null;
    if (repoPayload.full_name && repoPayload.full_name.includes('/')) {
      const [owner, repo] = repoPayload.full_name.split('/');
      parsedIncoming = { owner: owner.toLowerCase(), repo: repo.toLowerCase().replace(/\.git$/, '') };
    } else {
      for (const u of urlsToTest) {
        parsedIncoming = parseGitHubRepoUrl(u);
        if (parsedIncoming) break;
      }
    }

    if (!parsedIncoming) return null;

    const projects = await pgDb.query<any>('SELECT id, name, repo_url FROM projects WHERE repo_url IS NOT NULL;');
    for (const p of projects) {
      const parsedProject = parseGitHubRepoUrl(p.repo_url);
      if (
        parsedProject &&
        parsedProject.owner.toLowerCase() === parsedIncoming.owner.toLowerCase() &&
        parsedProject.repo.toLowerCase() === parsedIncoming.repo.toLowerCase()
      ) {
        return { id: p.id, name: p.name, repoUrl: p.repo_url };
      }
    }

    return null;
  }

  /**
   * Processes an incoming push event: ingests commits and updates the chronological timeline.
   */
  async processPushEvent(deliveryId: string, payload: any): Promise<WebhookProcessResult> {
    const project = await this.findProjectForRepository(payload.repository);
    if (!project) {
      await this.recordDelivery(deliveryId, 'push', null, 'IGNORED_NO_MATCH');
      return {
        success: true,
        event: 'push',
        deliveryId,
        message: 'No matching VestiNex project found for repository. Webhook accepted safely.',
      };
    }

    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : 'main';
    const repoUrl = payload.repository?.html_url || project.repoUrl;
    const now = new Date();
    let ingestedCount = 0;

    await pgDb.transaction(async (client) => {
      for (const c of commits) {
        const commitSha = c.id;
        if (!commitSha) continue;

        const committedAt = c.timestamp ? new Date(c.timestamp) : now;
        const authorName = c.author?.name || 'GitHub Webhook';
        const authorEmail = c.author?.email ? `<${c.author.email}>` : '';
        const author = `${authorName} ${authorEmail}`.trim();
        const message = c.message || 'No commit message';
        const pullRequestUrl = c.url || null;

        const files = [
          ...(c.added || []).map((f: string) => `+ ${f}`),
          ...(c.modified || []).map((f: string) => `~ ${f}`),
          ...(c.removed || []).map((f: string) => `- ${f}`),
        ];
        const filesChanged = files.length > 0 ? files.slice(0, 5).join(', ') : null;

        // Idempotent commit insertion at database level
        const insertRes = await client.query<{ id: string }>(
          `INSERT INTO code_changes (id, project_id, commit_sha, message, author, branch, repo_url, committed_at, pull_request_url, files_changed, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (commit_sha, project_id) DO NOTHING
           RETURNING id;`,
          [
            `commit_${uuidv4().substring(0, 8)}`,
            project.id,
            commitSha,
            message,
            author,
            branch,
            repoUrl,
            committedAt,
            pullRequestUrl,
            filesChanged,
            now,
          ]
        );

        if (insertRes.length > 0) {
          ingestedCount++;

          // Record timeline event with true occurrence time
          await client.query(
            `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
            [
              `tle_${uuidv4().substring(0, 8)}`,
              project.id,
              'CODE_CHANGE_RECORDED',
              `Commit ${commitSha.substring(0, 7)} Pushed`,
              message.length > 80 ? `${message.substring(0, 80)}...` : message,
              JSON.stringify({ author, sha: commitSha, branch, viaWebhook: true }),
              insertRes[0].id,
              'CODE_CHANGE',
              committedAt,
              now,
              now,
            ]
          );
        }
      }

      await client.query(
        `INSERT INTO webhook_deliveries (id, delivery_id, event_type, project_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (delivery_id) DO NOTHING;`,
        [`whd_${uuidv4().substring(0, 8)}`, deliveryId, 'push', project.id, 'PROCESSED', now]
      );
    });

    // Record audit log
    await auditService.record(
      null,
      'GITHUB_WEBHOOK_PUSH',
      'PROJECT',
      project.id,
      { deliveryId, commitsReceived: commits.length, commitsIngested: ingestedCount, branch },
      undefined,
      project.id
    );

    // Broadcast real-time update to project listeners
    if (ingestedCount > 0) {
      realtimeService.publish(project.id, {
        type: 'CODE_CHANGE_RECORDED',
        commitsCount: ingestedCount,
        branch,
      });
    }

    return {
      success: true,
      event: 'push',
      deliveryId,
      projectId: project.id,
      message: `Successfully processed push event. Ingested ${ingestedCount} new commits into project '${project.name}'.`,
      details: { totalCommits: commits.length, ingestedCount, branch },
    };
  }

  /**
   * Processes deployment events from GitHub Actions / GitHub Deployments API.
   */
  async processDeploymentEvent(deliveryId: string, payload: any): Promise<WebhookProcessResult> {
    const project = await this.findProjectForRepository(payload.repository);
    if (!project) {
      await this.recordDelivery(deliveryId, 'deployment', null, 'IGNORED_NO_MATCH');
      return {
        success: true,
        event: 'deployment',
        deliveryId,
        message: 'No matching VestiNex project found for repository.',
      };
    }

    const deployment = payload.deployment;
    if (!deployment) {
      await this.recordDelivery(deliveryId, 'deployment', project.id, 'IGNORED_NO_PAYLOAD');
      return {
        success: true,
        event: 'deployment',
        deliveryId,
        message: 'Deployment payload was empty or incomplete.',
      };
    }

    const now = new Date();
    const envRaw = (deployment.environment || 'PRODUCTION').toUpperCase();
    const environment = ['PRODUCTION', 'STAGING', 'DEVELOPMENT'].includes(envRaw) ? envRaw : 'PRODUCTION';
    const commitSha = deployment.sha || null;
    const branch = deployment.ref || 'main';
    const version = deployment.task === 'deploy' && commitSha ? `gh-${commitSha.substring(0, 7)}` : `deploy-${deliveryId.substring(0, 6)}`;
    const depId = `dep_gh_${deployment.id || uuidv4().substring(0, 8)}`;

    await pgDb.transaction(async (client) => {
      await client.query(
        `INSERT INTO deployments (id, project_id, environment, version, commit_sha, branch, status, started_at, occurred_at, ingested_at, release_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING;`,
        [
          depId,
          project.id,
          environment,
          version,
          commitSha,
          branch,
          'RUNNING',
          now,
          now,
          now,
          deployment.description || 'Triggered via GitHub Deployment API',
          now,
          now,
        ]
      );

      await client.query(
        `INSERT INTO deployment_status_history (id, deployment_id, from_status, to_status, note, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [`dsh_${uuidv4().substring(0, 8)}`, depId, null, 'RUNNING', 'Deployment initiated via GitHub webhook', now]
      );

      await client.query(
        `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          `tle_${uuidv4().substring(0, 8)}`,
          project.id,
          'DEPLOYMENT_CREATED',
          `Deployment Initiated (${version})`,
          deployment.description || `Automated deployment on branch ${branch}`,
          JSON.stringify({ version, commitSha, environment, viaWebhook: true }),
          depId,
          'DEPLOYMENT',
          now,
          now,
          now,
        ]
      );

      await client.query(
        `INSERT INTO webhook_deliveries (id, delivery_id, event_type, project_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (delivery_id) DO NOTHING;`,
        [`whd_${uuidv4().substring(0, 8)}`, deliveryId, 'deployment', project.id, 'PROCESSED', now]
      );
    });

    await auditService.record(
      null,
      'GITHUB_WEBHOOK_DEPLOYMENT',
      'DEPLOYMENT',
      depId,
      { deliveryId, version, environment, commitSha },
      undefined,
      project.id
    );

    realtimeService.publish(project.id, {
      type: 'DEPLOYMENT_CREATED',
      deploymentId: depId,
      version,
      environment,
    });

    return {
      success: true,
      event: 'deployment',
      deliveryId,
      projectId: project.id,
      message: `Recorded deployment '${version}' for project '${project.name}'.`,
    };
  }

  /**
   * Processes deployment_status events from GitHub Actions.
   */
  async processDeploymentStatusEvent(deliveryId: string, payload: any): Promise<WebhookProcessResult> {
    const project = await this.findProjectForRepository(payload.repository);
    if (!project) {
      await this.recordDelivery(deliveryId, 'deployment_status', null, 'IGNORED_NO_MATCH');
      return {
        success: true,
        event: 'deployment_status',
        deliveryId,
        message: 'No matching VestiNex project found for repository.',
      };
    }

    const statusPayload = payload.deployment_status;
    const deployment = payload.deployment;
    if (!statusPayload) {
      await this.recordDelivery(deliveryId, 'deployment_status', project.id, 'IGNORED_NO_STATUS');
      return {
        success: true,
        event: 'deployment_status',
        deliveryId,
        message: 'No deployment_status data found in payload.',
      };
    }

    const state = (statusPayload.state || '').toLowerCase();
    let mappedStatus: 'SUCCESSFUL' | 'FAILED' | 'RUNNING' = 'RUNNING';
    if (state === 'success') {
      mappedStatus = 'SUCCESSFUL';
    } else if (['failure', 'error'].includes(state)) {
      mappedStatus = 'FAILED';
    }

    const now = new Date();
    const ghDepId = deployment?.id ? `dep_gh_${deployment.id}` : null;

    // Find deployment if exists
    let targetDepId = ghDepId;
    if (ghDepId) {
      const depRows = await pgDb.query<{ id: string }>('SELECT id FROM deployments WHERE id = $1 LIMIT 1;', [ghDepId]);
      if (depRows.length === 0 && deployment?.sha) {
        // Find latest matching deployment by commit_sha
        const match = await pgDb.query<{ id: string }>(
          'SELECT id FROM deployments WHERE project_id = $1 AND commit_sha = $2 ORDER BY occurred_at DESC LIMIT 1;',
          [project.id, deployment.sha]
        );
        if (match.length > 0) targetDepId = match[0].id;
      }
    }

    if (targetDepId) {
      await pgDb.transaction(async (client) => {
        await client.query(
          `UPDATE deployments
           SET status = $1, completed_at = $2, updated_at = $3
           WHERE id = $4;`,
          [mappedStatus, now, now, targetDepId]
        );

        await client.query(
          `INSERT INTO deployment_status_history (id, deployment_id, from_status, to_status, note, changed_at)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [
            `dsh_${uuidv4().substring(0, 8)}`,
            targetDepId,
            'RUNNING',
            mappedStatus,
            statusPayload.description || `Updated via GitHub deployment_status (${state})`,
            now,
          ]
        );

        await client.query(
          `INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
          [
            `tle_${uuidv4().substring(0, 8)}`,
            project.id,
            'DEPLOYMENT_STATUS_CHANGED',
            `Deployment ${mappedStatus}`,
            statusPayload.description || `GitHub deployment transitioned to ${state}`,
            JSON.stringify({ status: mappedStatus, ghState: state, viaWebhook: true }),
            targetDepId,
            'DEPLOYMENT',
            now,
            now,
            now,
          ]
        );

        await client.query(
          `INSERT INTO webhook_deliveries (id, delivery_id, event_type, project_id, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (delivery_id) DO NOTHING;`,
          [`whd_${uuidv4().substring(0, 8)}`, deliveryId, 'deployment_status', project.id, 'PROCESSED', now]
        );
      });

      await auditService.record(
        null,
        'GITHUB_WEBHOOK_DEPLOYMENT_STATUS',
        'DEPLOYMENT',
        targetDepId,
        { deliveryId, state, mappedStatus },
        undefined,
        project.id
      );

      realtimeService.publish(project.id, {
        type: 'DEPLOYMENT_STATUS_CHANGED',
        deploymentId: targetDepId,
        status: mappedStatus,
      });
    } else {
      await this.recordDelivery(deliveryId, 'deployment_status', project.id, 'PROCESSED_NO_DEP_RECORD');
    }

    return {
      success: true,
      event: 'deployment_status',
      deliveryId,
      projectId: project.id,
      message: `Processed deployment_status event. Status mapped to ${mappedStatus}.`,
    };
  }

  /**
   * Processes a ping event sent when a webhook is first created in GitHub settings.
   */
  async processPingEvent(deliveryId: string, payload: any): Promise<WebhookProcessResult> {
    const project = await this.findProjectForRepository(payload.repository);
    await this.recordDelivery(deliveryId, 'ping', project ? project.id : null, 'PONG');

    if (project) {
      await auditService.record(
        null,
        'GITHUB_WEBHOOK_PING',
        'PROJECT',
        project.id,
        { deliveryId, hookId: payload.hook_id, zen: payload.zen },
        undefined,
        project.id
      );
    }

    return {
      success: true,
      event: 'ping',
      deliveryId,
      projectId: project?.id || null,
      message: 'PONG! GitHub webhook connection verified successfully.',
      details: { zen: payload.zen, hookId: payload.hook_id },
    };
  }
}

export const webhookService = new WebhookService();
