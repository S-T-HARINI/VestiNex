import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app';
import { pgDb } from '../src/lib/postgres';
import { realtimeService } from '../src/services/realtime.service';

describe('VestiNex Platform Bonus Features Test Suite', () => {
  const TEST_WEBHOOK_SECRET = 'test_webhook_secret_key_12345';
  let adminCookie: string;
  let devCookie: string;
  let viewerCookie: string;
  let outsiderCookie: string;

  let adminUser: any;
  let devUser: any;
  let viewerUser: any;
  let outsiderUser: any;

  let testProjectId: string;
  let outsiderProjectId: string;
  let testIncidentId: string;
  let testDeploymentId: string;
  let testRepoFullName: string;
  let testRepoUrl: string;

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    // 1. Register test users
    const ts = Date.now();
    testRepoFullName = `bonus-org/repo-${ts}`;
    testRepoUrl = `https://github.com/${testRepoFullName}.git`;

    const resAdmin = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin Lead', email: `admin_bonus_${ts}@test.io`, password: 'password123' });
    adminCookie = resAdmin.headers['set-cookie'][0];
    adminUser = resAdmin.body.user;

    const resDev = await request(app)
      .post('/api/auth/register')
      .send({ name: 'SRE Developer', email: `dev_bonus_${ts}@test.io`, password: 'password123' });
    devCookie = resDev.headers['set-cookie'][0];
    devUser = resDev.body.user;

    const resViewer = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Incident Observer', email: `viewer_bonus_${ts}@test.io`, password: 'password123' });
    viewerCookie = resViewer.headers['set-cookie'][0];
    viewerUser = resViewer.body.user;

    const resOutsider = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Unrelated Outsider', email: `outsider_bonus_${ts}@test.io`, password: 'password123' });
    outsiderCookie = resOutsider.headers['set-cookie'][0];
    outsiderUser = resOutsider.body.user;

    // 2. Admin creates a project and adds dev as DEVELOPER and viewer as VIEWER
    const resProj = await request(app)
      .post('/api/projects')
      .set('Cookie', adminCookie)
      .send({
        name: 'Bonus Features Monitored Engine',
        description: 'Testing webhooks, SSE, RBAC, deduplication, and audit logs',
        repoUrl: testRepoUrl,
        environment: 'PRODUCTION',
      });
    testProjectId = resProj.body.project.id;

    await request(app)
      .post(`/api/projects/${testProjectId}/members`)
      .set('Cookie', adminCookie)
      .send({ email: devUser.email, role: 'DEVELOPER' });

    await request(app)
      .post(`/api/projects/${testProjectId}/members`)
      .set('Cookie', adminCookie)
      .send({ email: viewerUser.email, role: 'VIEWER' });

    // 3. Outsider creates an isolated project
    const resOutProj = await request(app)
      .post('/api/projects')
      .set('Cookie', outsiderCookie)
      .send({
        name: 'Outsider Private Workspace',
        description: 'Should remain completely unreachable to other users',
        environment: 'DEVELOPMENT',
      });
    outsiderProjectId = resOutProj.body.project.id;

    // 4. Admin creates an initial deployment and incident
    const resDep = await request(app)
      .post(`/api/projects/${testProjectId}/deployments`)
      .set('Cookie', adminCookie)
      .send({
        version: 'v3.0.0',
        environment: 'PRODUCTION',
        commitSha: 'e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
        branch: 'main',
        status: 'RUNNING',
      });
    testDeploymentId = resDep.body.deployment.id;

    const resInc = await request(app)
      .post(`/api/projects/${testProjectId}/incidents`)
      .set('Cookie', adminCookie)
      .send({
        title: 'Initial Latency Degrade',
        severity: 'HIGH',
        status: 'OPEN',
      });
    testIncidentId = resInc.body.incident.id;
  });

  // ════════════════════════════════════════════════════════════
  // BONUS FEATURE A: GITHUB WEBHOOKS
  // ════════════════════════════════════════════════════════════
  describe('Bonus Feature A: GitHub Webhooks', () => {
    function computeSignature(payload: any, secret: string): string {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(Buffer.from(JSON.stringify(payload), 'utf8'));
      return `sha256=${hmac.digest('hex')}`;
    }

    it('rejects webhooks with missing signature when secret is configured (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('x-github-event', 'ping')
        .set('x-github-delivery', 'del_no_sig_001')
        .send({ zen: 'Keep it logically awesome.' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('signature');
    });

    it('rejects webhooks with invalid cryptographic signature (HTTP 401)', async () => {
      const payload = { zen: 'Favor focus over features.' };
      const res = await request(app)
        .post('/api/webhooks/github')
        .set('x-github-event', 'ping')
        .set('x-github-delivery', 'del_invalid_sig_002')
        .set('x-hub-signature-256', 'sha256=ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('signature');
    });

    it('accepts ping event with valid signature (HTTP 200)', async () => {
      const pingDeliveryId = `del_ping_${Date.now()}`;
      const payload = {
        zen: 'Approachable is better than simple.',
        hook_id: 123456,
        repository: {
          html_url: `https://github.com/${testRepoFullName}`,
          full_name: testRepoFullName,
        },
      };
      const signature = computeSignature(payload, TEST_WEBHOOK_SECRET);

      const res = await request(app)
        .post('/api/webhooks/github')
        .set('x-github-event', 'ping')
        .set('x-github-delivery', pingDeliveryId)
        .set('x-hub-signature-256', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event).toBe('ping');
    });

    it('processes push event and ingests commits into matching project (HTTP 200)', async () => {
      const commitSha = `sha_${Date.now().toString(16)}`;
      const payload = {
        ref: 'refs/heads/main',
        repository: {
          html_url: `https://github.com/${testRepoFullName}`,
          full_name: testRepoFullName,
        },
        commits: [
          {
            id: commitSha,
            message: 'feat(router): add zero-copy streaming pipeline',
            timestamp: new Date().toISOString(),
            author: { name: 'Linus Torvalds', email: 'torvalds@kernel.org' },
            url: `https://github.com/${testRepoFullName}/commit/${commitSha}`,
            added: ['lib/stream.js'],
            modified: ['package.json'],
            removed: [],
          },
        ],
      };
      const signature = computeSignature(payload, TEST_WEBHOOK_SECRET);

      const res = await request(app)
        .post('/api/webhooks/github')
        .set('x-github-event', 'push')
        .set('x-github-delivery', `del_push_${commitSha}`)
        .set('x-hub-signature-256', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.projectId).toBe(testProjectId);
      expect(res.body.details.ingestedCount).toBe(1);

      // Verify commit is persisted in database
      const commits = await pgDb.query<any>(
        'SELECT * FROM code_changes WHERE project_id = $1 AND commit_sha = $2 LIMIT 1;',
        [testProjectId, commitSha]
      );
      expect(commits.length).toBe(1);
      expect(commits[0].message).toContain('zero-copy streaming');
    });

    it('deduplicates identical webhook deliveries by X-GitHub-Delivery (HTTP 200, deduplicated: true)', async () => {
      const fixedDeliveryId = `del_dup_test_${Date.now()}`;
      const payload = {
        ref: 'refs/heads/main',
        repository: { full_name: testRepoFullName },
        commits: [],
      };
      const signature = computeSignature(payload, TEST_WEBHOOK_SECRET);

      // First delivery -> processed
      const res1 = await request(app)
        .post('/api/webhooks/github')
        .set('x-github-event', 'push')
        .set('x-github-delivery', fixedDeliveryId)
        .set('x-hub-signature-256', signature)
        .send(payload);
      expect(res1.status).toBe(200);
      expect(res1.body.deduplicated).toBeFalsy();

      // Second delivery with same delivery ID -> deduplicated
      const res2 = await request(app)
        .post('/api/webhooks/github')
        .set('x-github-event', 'push')
        .set('x-github-delivery', fixedDeliveryId)
        .set('x-hub-signature-256', signature)
        .send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.deduplicated).toBe(true);
      expect(res2.body.message).toContain('already processed');
    });

    it('processes deployment and deployment_status events (HTTP 200)', async () => {
      const ghDepId = 987654;
      const deployPayload = {
        repository: { full_name: testRepoFullName },
        deployment: {
          id: ghDepId,
          sha: 'b8c9d0e1f2a3b4c5d6e7f8a9e0f1a2b3c4d5e6f7',
          ref: 'main',
          environment: 'PRODUCTION',
          task: 'deploy',
          description: 'Production container deploy via GitHub Actions',
        },
      };

      const sig1 = computeSignature(deployPayload, TEST_WEBHOOK_SECRET);
      const res1 = await request(app)
        .post('/api/webhooks/github')
        .set('x-github-event', 'deployment')
        .set('x-github-delivery', `del_dep_${ghDepId}`)
        .set('x-hub-signature-256', sig1)
        .send(deployPayload);
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      // Now send deployment_status: success
      const statusPayload = {
        repository: { full_name: testRepoFullName },
        deployment: { id: ghDepId },
        deployment_status: {
          state: 'success',
          description: 'Container health probes nominal across all replicas',
        },
      };
      const sig2 = computeSignature(statusPayload, TEST_WEBHOOK_SECRET);
      const res2 = await request(app)
        .post('/api/webhooks/github')
        .set('x-github-event', 'deployment_status')
        .set('x-github-delivery', `del_dep_stat_${ghDepId}`)
        .set('x-hub-signature-256', sig2)
        .send(statusPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);

      // Verify deployment record in DB
      const depInDb = await pgDb.query<any>('SELECT * FROM deployments WHERE id = $1 LIMIT 1;', [`dep_gh_${ghDepId}`]);
      expect(depInDb.length).toBe(1);
      expect(depInDb[0].status).toBe('SUCCESSFUL');
    });
  });

  // ════════════════════════════════════════════════════════════
  // BONUS FEATURE B: REAL-TIME UPDATES (SSE)
  // ════════════════════════════════════════════════════════════
  describe('Bonus Feature B: Real-Time Incident Updates', () => {
    it('scopes subscription authorization: authorized member can subscribe to SSE stream', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProjectId}/events?once=true`)
        .set('Cookie', viewerCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.text).toContain('CONNECTED');
    });

    it('rejects unauthorized subscription to unrelated workspace SSE stream (HTTP 403)', async () => {
      const res = await request(app)
        .get(`/api/projects/${outsiderProjectId}/events`)
        .set('Cookie', devCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Access denied');
    });

    it('realtimeService publishes event to subscribed clients and gracefully handles disconnected clients', () => {
      let messageReceived = '';
      const mockRes: any = {
        setHeader: () => {},
        flushHeaders: () => {},
        write: (msg: string) => {
          messageReceived += msg;
        },
        on: () => {},
      };

      const cleanup = realtimeService.subscribe('mock_proj_123', 'mock_user_1', mockRes);
      expect(realtimeService.getActiveClientCount('mock_proj_123')).toBe(1);

      realtimeService.publish('mock_proj_123', {
        type: 'INCIDENT_STATUS_CHANGED',
        incidentId: 'inc_mock_001',
        status: 'INVESTIGATING',
      });

      expect(messageReceived).toContain('INCIDENT_STATUS_CHANGED');
      expect(messageReceived).toContain('inc_mock_001');

      cleanup();
      expect(realtimeService.getActiveClientCount('mock_proj_123')).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════
  // BONUS FEATURE C: ROLE-BASED ACCESS CONTROL (RBAC)
  // ════════════════════════════════════════════════════════════
  describe('Bonus Feature C: Role-Based Access Control', () => {
    it('enforces Observer/Viewer read access: viewer CAN read project, incidents, timeline, audit logs', async () => {
      const resProj = await request(app).get(`/api/projects/${testProjectId}`).set('Cookie', viewerCookie);
      expect(resProj.status).toBe(200);

      const resInc = await request(app).get(`/api/projects/${testProjectId}/incidents`).set('Cookie', viewerCookie);
      expect(resInc.status).toBe(200);

      const resAudit = await request(app).get(`/api/projects/${testProjectId}/audit`).set('Cookie', viewerCookie);
      expect(resAudit.status).toBe(200);
    });

    it('denies Observer/Viewer write access: viewer CANNOT create incident (HTTP 403)', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProjectId}/incidents`)
        .set('Cookie', viewerCookie)
        .send({
          title: 'Unauthorized Incident by Observer',
          severity: 'LOW',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Insufficient permissions');
    });

    it('denies Observer/Viewer write access: viewer CANNOT update incident status or add comment (HTTP 403)', async () => {
      const resStatus = await request(app)
        .patch(`/api/incidents/${testIncidentId}/status`)
        .set('Cookie', viewerCookie)
        .send({ status: 'RESOLVED', note: 'Viewer attempt' });

      expect(resStatus.status).toBe(403);

      const resComment = await request(app)
        .post(`/api/incidents/${testIncidentId}/comments`)
        .set('Cookie', viewerCookie)
        .send({ content: 'Viewer note attempt' });

      expect(resComment.status).toBe(403);
    });

    it('denies Developer administrative actions: developer CANNOT modify project settings or members (HTTP 403)', async () => {
      const resSettings = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .set('Cookie', devCookie)
        .send({ name: 'Tampered Name by Developer' });

      expect(resSettings.status).toBe(403);
      expect(resSettings.body.error).toContain('Insufficient permissions');

      const resAddMember = await request(app)
        .post(`/api/projects/${testProjectId}/members`)
        .set('Cookie', devCookie)
        .send({ email: outsiderUser.email, role: 'DEVELOPER' });

      expect(resAddMember.status).toBe(403);
    });

    it('denies non-member cross-project access entirely (HTTP 403)', async () => {
      const resRead = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Cookie', outsiderCookie);
      expect(resRead.status).toBe(403);

      const resInc = await request(app)
        .get(`/api/incidents/${testIncidentId}`)
        .set('Cookie', outsiderCookie);
      expect(resInc.status).toBe(403);

      const resDep = await request(app)
        .get(`/api/deployments/${testDeploymentId}`)
        .set('Cookie', outsiderCookie);
      expect(resDep.status).toBe(403);
    });
  });

  // ════════════════════════════════════════════════════════════
  // BONUS FEATURE D: DEDUPLICATION & OUT-OF-ORDER HANDLING
  // ════════════════════════════════════════════════════════════
  describe('Bonus Feature D: Event Deduplication and Out-of-Order Handling', () => {
    it('enforces database-level code change deduplication on (commitSha, projectId)', async () => {
      const duplicateSha = 'dup1234567890abcdef1234567890abcdef1234';

      const res1 = await request(app)
        .post(`/api/projects/${testProjectId}/code-changes`)
        .set('Cookie', adminCookie)
        .send({
          commitSha: duplicateSha,
          message: 'feat: deduplication test first run',
          author: 'Alice Engineer <alice@test.io>',
          branch: 'main',
          committedAt: new Date().toISOString(),
        });
      expect(res1.status).toBe(201);

      // Attempting to insert identical commit in same project is rejected with HTTP 409 CONFLICT
      const res2 = await request(app)
        .post(`/api/projects/${testProjectId}/code-changes`)
        .set('Cookie', adminCookie)
        .send({
          commitSha: duplicateSha,
          message: 'feat: deduplication test second run',
          author: 'Alice Engineer <alice@test.io>',
          branch: 'main',
          committedAt: new Date().toISOString(),
        });
      // Should reject with 409 Conflict without database constraint violation crash
      expect(res2.status).toBe(409);
      expect(res2.body.error).toContain('already been recorded');

      const commitRows = await pgDb.query<any>(
        'SELECT count(*) as count FROM code_changes WHERE project_id = $1 AND commit_sha = $2;',
        [testProjectId, duplicateSha]
      );
      expect(parseInt(commitRows[0].count, 10)).toBe(1);
    });

    it('rejects stale / out-of-order incident status updates (HTTP 409 STALE_EVENT)', async () => {
      // Transition incident to INVESTIGATING now
      const transitionRes = await request(app)
        .patch(`/api/incidents/${testIncidentId}/status`)
        .set('Cookie', devCookie)
        .send({
          status: 'INVESTIGATING',
          note: 'Investigating onset spike.',
        });
      expect(transitionRes.status).toBe(200);

      // A delayed/out-of-order event packet arrives claiming to transition status to OPEN,
      // but its occurrence time was 2 hours in the past
      const pastTime = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const staleRes = await request(app)
        .patch(`/api/incidents/${testIncidentId}/status`)
        .set('Cookie', devCookie)
        .send({
          status: 'OPEN',
          note: 'Delayed telemetry packet from queue',
          occurredAt: pastTime,
        });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error).toContain('Stale / Out-of-order');

      // Verify incident remains in INVESTIGATING state
      const currentInc = await request(app).get(`/api/incidents/${testIncidentId}`).set('Cookie', devCookie);
      expect(currentInc.body.incident.status).toBe('INVESTIGATING');
    });

    it('detects concurrent edit conflict via optimistic concurrency check (HTTP 409 CONFLICT)', async () => {
      const getRes = await request(app).get(`/api/incidents/${testIncidentId}`).set('Cookie', devCookie);
      const staleUpdatedAt = new Date(Date.now() - 60000).toISOString();

      const conflictRes = await request(app)
        .patch(`/api/incidents/${testIncidentId}`)
        .set('Cookie', devCookie)
        .send({
          title: 'Conflicting Title Update',
          expectedUpdatedAt: staleUpdatedAt,
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.code).toBe('CONFLICT');
      expect(conflictRes.body.error).toContain('Concurrent edit conflict');
    });
  });

  // ════════════════════════════════════════════════════════════
  // BONUS FEATURE E: AUDIT LOGS
  // ════════════════════════════════════════════════════════════
  describe('Bonus Feature E: Audit Logs', () => {
    it('creates persistent audit logs with project scope and actor information', async () => {
      const auditRes = await request(app)
        .get(`/api/projects/${testProjectId}/audit`)
        .set('Cookie', devCookie);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.success).toBe(true);
      expect(Array.isArray(auditRes.body.logs)).toBe(true);
      expect(auditRes.body.logs.length).toBeGreaterThanOrEqual(1);

      // Verify all returned logs belong to testProjectId
      for (const log of auditRes.body.logs) {
        expect(log.projectId).toBe(testProjectId);
      }
    });

    it('never leaks sensitive credentials, secrets, or tokens into audit changes', async () => {
      const auditRes = await request(app)
        .get(`/api/projects/${testProjectId}/audit`)
        .set('Cookie', adminCookie);

      const logsJson = JSON.stringify(auditRes.body.logs);
      expect(logsJson).not.toContain('password123');
      expect(logsJson).not.toContain(TEST_WEBHOOK_SECRET);
    });

    it('enforces read-only protection: ordinary users cannot delete or modify audit logs', async () => {
      // Attempt to DELETE or PATCH audit logs -> 404 Not Found (no mutating routes provided)
      const delRes = await request(app)
        .delete(`/api/dashboard/audit`)
        .set('Cookie', adminCookie);
      expect(delRes.status).toBe(404);

      const patchRes = await request(app)
        .patch(`/api/dashboard/audit`)
        .set('Cookie', adminCookie);
      expect(patchRes.status).toBe(404);
    });
  });
});
