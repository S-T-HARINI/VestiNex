import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('VestiNex Backend API Integration Tests', () => {
  let authCookie: string;
  let createdProjectId: string;
  let createdDeploymentId: string;
  let createdIncidentId: string;

  // 1. Health check
  it('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  // 2. Authentication: Login
  it('POST /api/auth/login logs in existing admin successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@vestinex.io',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('admin@vestinex.io');
    expect(res.body.user.role).toBe('ADMIN');

    // Extract cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies[0];
  });

  // 3. Current user check
  it('GET /api/auth/me returns authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toContain('Sarah Chen');
  });

  // 4. Project listing
  it('GET /api/projects returns accessible projects', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.projects)).toBe(true);
    expect(res.body.projects.length).toBeGreaterThanOrEqual(1);
  });

  // 5. Create project
  it('POST /api/projects creates a new project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', authCookie)
      .send({
        name: 'Telemetry Ingestion Stream',
        description: 'Distributed metrics and high-volume trace ingestion pipeline.',
        repoUrl: 'https://github.com/S-T-HARINI/VestiNex.git',
        environment: 'PRODUCTION',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.project.name).toBe('Telemetry Ingestion Stream');
    createdProjectId = res.body.project.id;
  });

  // 6. Create deployment
  it('POST /api/projects/:id/deployments records a deployment', async () => {
    const res = await request(app)
      .post(`/api/projects/${createdProjectId}/deployments`)
      .set('Cookie', authCookie)
      .send({
        environment: 'PRODUCTION',
        version: 'v1.0.0',
        commitSha: 'd8e4f1a',
        branch: 'main',
        status: 'RUNNING',
        releaseNotes: 'Initial production rollout of ingestion broker.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.deployment.version).toBe('v1.0.0');
    createdDeploymentId = res.body.deployment.id;
  });

  // 7. Update deployment status
  it('PATCH /api/deployments/:id/status updates deployment to SUCCESSFUL', async () => {
    const res = await request(app)
      .patch(`/api/deployments/${createdDeploymentId}/status`)
      .set('Cookie', authCookie)
      .send({
        status: 'SUCCESSFUL',
        note: 'All smoke test checks passed.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deployment.status).toBe('SUCCESSFUL');
  });

  // 8. Record code change
  it('POST /api/projects/:id/code-changes records commit', async () => {
    const res = await request(app)
      .post(`/api/projects/${createdProjectId}/code-changes`)
      .set('Cookie', authCookie)
      .send({
        commitSha: 'd8e4f1a',
        message: 'feat(ingest): add backpressure buffer on websocket ingestion stream',
        author: 'Alex Rivera <alex@vestinex.io>',
        branch: 'main',
        committedAt: new Date().toISOString(),
        deploymentId: createdDeploymentId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.codeChange.commitSha).toBe('d8e4f1a');
  });

  // 9. Create incident
  it('POST /api/projects/:id/incidents opens an incident', async () => {
    const res = await request(app)
      .post(`/api/projects/${createdProjectId}/incidents`)
      .set('Cookie', authCookie)
      .send({
        title: 'Buffer Overflow on Kafka Consumer Lag Spike',
        description: 'Ingestion pipeline queue overflow after traffic burst.',
        severity: 'HIGH',
        status: 'OPEN',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.incident.severity).toBe('HIGH');
    createdIncidentId = res.body.incident.id;
  });

  // 10. Link incident to deployment (correlation investigation)
  it('POST /api/incidents/:id/link-deployment correlates incident to deployment', async () => {
    const res = await request(app)
      .post(`/api/incidents/${createdIncidentId}/link-deployment`)
      .set('Cookie', authCookie)
      .send({
        deploymentId: createdDeploymentId,
        confidence: 'high',
        note: 'Deployment introduced buffer size adjustments.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.link.confidence).toBe('high');
  });

  // 11. Add comment to incident
  it('POST /api/incidents/:id/comments posts investigation notes', async () => {
    const res = await request(app)
      .post(`/api/incidents/${createdIncidentId}/comments`)
      .set('Cookie', authCookie)
      .send({
        content: 'Analyzing consumer group lag metrics across partitions.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.comment.content).toContain('Analyzing consumer group');
  });

  // 11b. Regression test: Activity note receives accurate UTC insertion timestamp without timezone distortion
  it('POST & GET /api/incidents/:id/comments persists accurate UTC timestamp without timezone offset distortion', async () => {
    const beforePost = Date.now();
    const commentContent = `Telemetry timestamp verification note at ${beforePost}`;

    const postRes = await request(app)
      .post(`/api/incidents/${createdIncidentId}/comments`)
      .set('Cookie', authCookie)
      .send({ content: commentContent });

    expect(postRes.status).toBe(201);
    expect(postRes.body.success).toBe(true);

    const postCreatedAt = new Date(postRes.body.comment.createdAt).getTime();
    expect(Math.abs(postCreatedAt - beforePost)).toBeLessThan(5000);

    // Retrieve via GET incident to verify database persistence & type parsing
    const getRes = await request(app)
      .get(`/api/incidents/${createdIncidentId}`)
      .set('Cookie', authCookie);

    expect(getRes.status).toBe(200);
    const persistedComment = getRes.body.incident.comments.find(
      (c: any) => c.content === commentContent
    );
    expect(persistedComment).toBeDefined();

    const persistedCreatedAt = new Date(persistedComment.createdAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.round((now - persistedCreatedAt) / 1000);

    // Elapsed seconds must be near-zero (< 5s), NOT distorted by local timezone offset (e.g. ~5.5 hours / ~19800s)
    expect(elapsedSeconds).toBeGreaterThanOrEqual(0);
    expect(elapsedSeconds).toBeLessThan(5);
  });

  // 12. Transition incident status to RESOLVED
  it('PATCH /api/incidents/:id/status transitions incident to RESOLVED', async () => {
    const res = await request(app)
      .patch(`/api/incidents/${createdIncidentId}/status`)
      .set('Cookie', authCookie)
      .send({
        status: 'RESOLVED',
        note: 'Scaled consumer replicas from 3 to 12. Buffer cleared.',
        resolutionNote: 'Root cause was partition skew during burst.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.incident.status).toBe('RESOLVED');
  });

  // 13. Timeline retrieval
  it('GET /api/projects/:id/timeline returns chronological events', async () => {
    const res = await request(app)
      .get(`/api/projects/${createdProjectId}/timeline`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.events.length).toBeGreaterThan(0);
  });

  // 14. Dashboard metrics
  it('GET /api/projects/:id/dashboard returns operational metrics & MTTR', async () => {
    const res = await request(app)
      .get(`/api/projects/${createdProjectId}/dashboard`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(res.body.severityDistribution).toBeDefined();
  });

  // 15. Duplicate commit SHA ingestion conflict (HTTP 409)
  it('POST /api/projects/:id/code-changes rejects duplicate commit SHA with HTTP 409', async () => {
    const res = await request(app)
      .post(`/api/projects/${createdProjectId}/code-changes`)
      .set('Cookie', authCookie)
      .send({
        commitSha: 'd8e4f1a', // duplicate commitSha from test 8
        message: 'duplicate commit event submission',
        author: 'Alex Rivera <alex@vestinex.io>',
        committedAt: new Date().toISOString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already been recorded');
  });

  // 16. Simultaneous update concurrency conflict (HTTP 409)
  it('PATCH /api/incidents/:id rejects concurrent edits with stale expectedUpdatedAt with HTTP 409', async () => {
    const staleDate = new Date(Date.now() - 7200000).toISOString();
    const res = await request(app)
      .patch(`/api/incidents/${createdIncidentId}`)
      .set('Cookie', authCookie)
      .send({
        title: 'Conflicting Concurrent Edit Title',
        expectedUpdatedAt: staleDate,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Concurrent edit conflict');
  });

  // 17. Out-of-order and delayed telemetry ingestion
  it('Calculates delay latency for out-of-order and delayed telemetry events', async () => {
    const tenMinutesAgo = new Date(Date.now() - 600000);
    const { timelineService } = await import('../src/services/timeline.service');
    await timelineService.recordTimelineEvent({
      projectId: createdProjectId,
      type: 'INCIDENT_CREATED',
      title: 'Delayed config change event from edge gateway',
      occurredAt: tenMinutesAgo,
    });

    const res = await request(app)
      .get(`/api/projects/${createdProjectId}/timeline?delayedOnly=true`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.events.length).toBeGreaterThan(0);
    const delayedEvent = res.body.events.find((e: any) => e.title.includes('Delayed config change'));
    expect(delayedEvent).toBeDefined();
    expect(delayedEvent.isDelayed).toBe(true);
    expect(delayedEvent.delaySeconds).toBeGreaterThan(500);
  });

  // 18. RBAC Authorization Protection
  it('Enforces RBAC: viewer cannot perform administrative operations', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'viewer@vestinex.io',
        password: 'password123',
      });
    expect(loginRes.status).toBe(200);
    const viewerCookie = loginRes.headers['set-cookie'][0];

    // Attempting to add a member as a viewer to a project where they are not OWNER/ADMIN
    const memberRes = await request(app)
      .post(`/api/projects/${createdProjectId}/members`)
      .set('Cookie', viewerCookie)
      .send({
        email: 'dev@vestinex.io',
        role: 'DEVELOPER',
      });
    expect(memberRes.status).toBe(403);
    expect(memberRes.body.success).toBe(false);
  });

  // 19. IDOR Prevention: Non-member cannot access or mutate incident
  it('Enforces IDOR prevention: non-member cannot access or mutate incident', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'viewer@vestinex.io',
        password: 'password123',
      });
    const viewerCookie = loginRes.headers['set-cookie'][0];

    // Non-member trying to GET incident directly
    const getRes = await request(app)
      .get(`/api/incidents/${createdIncidentId}`)
      .set('Cookie', viewerCookie);
    expect(getRes.status).toBe(403);
    expect(getRes.body.error).toContain('not a member of the project');

    // Non-member trying to PATCH incident directly
    const patchRes = await request(app)
      .patch(`/api/incidents/${createdIncidentId}`)
      .set('Cookie', viewerCookie)
      .send({ title: 'Hacked Title' });
    expect(patchRes.status).toBe(403);
  });

  // 20. IDOR Prevention: Non-member cannot access or mutate deployment
  it('Enforces IDOR prevention: non-member cannot access or mutate deployment', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'viewer@vestinex.io',
        password: 'password123',
      });
    const viewerCookie = loginRes.headers['set-cookie'][0];

    // Non-member trying to GET deployment directly
    const getRes = await request(app)
      .get(`/api/deployments/${createdDeploymentId}`)
      .set('Cookie', viewerCookie);
    expect(getRes.status).toBe(403);
    expect(getRes.body.error).toContain('not a member of the project');

    // Non-member trying to update deployment status
    const statusRes = await request(app)
      .patch(`/api/deployments/${createdDeploymentId}/status`)
      .set('Cookie', viewerCookie)
      .send({ status: 'FAILED' });
    expect(statusRes.status).toBe(403);
  });

  // 21. Database Persistence Across Server Restart Cycle
  it('Verifies database records persist across close and re-initialization (restart cycle)', async () => {
    const { pgDb } = await import('../src/lib/postgres');
    const testIncidentId = `inc_restart_test_${Date.now()}`;
    const now = new Date().toISOString();

    // Insert record
    await pgDb.query(
      `INSERT INTO incidents (id, project_id, title, description, severity, status, reported_by_id, occurred_at, ingested_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        testIncidentId,
        createdProjectId,
        'Restart Cycle Persistence Test',
        'Verifying persistence across simulated restart',
        'LOW',
        'OPEN',
        'usr_admin_001',
        now,
        now,
        now,
        now,
      ]
    );

    // Simulate database shutdown and restart
    await pgDb.close();
    await pgDb.init();

    // Verify record exists
    const records = await pgDb.query<any>('SELECT * FROM incidents WHERE id = $1', [testIncidentId]);
    expect(records.length).toBe(1);
    expect(records[0].title).toBe('Restart Cycle Persistence Test');

    // Clean up test record
    await pgDb.query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
  });

  // 22. Clean Workspace & Data Isolation for New Users
  it('Verifies new user registration starts with clean workspace (0 projects) and strict isolation', async () => {
    const uniqueEmail = `clean_user_${Date.now()}@example.com`;

    // 1. Register new user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jordan Taylor',
        email: uniqueEmail,
        password: 'password123',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.user.email).toBe(uniqueEmail);

    const newUserCookie = regRes.headers['set-cookie'][0];

    // 2. Verify new user has 0 projects initially
    const projRes = await request(app)
      .get('/api/projects')
      .set('Cookie', newUserCookie);

    expect(projRes.status).toBe(200);
    expect(projRes.body.projects).toEqual([]);

    // 3. Verify global overview has 0 stats and empty trends
    const dashRes = await request(app)
      .get('/api/dashboard/overview')
      .set('Cookie', newUserCookie);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.stats.totalProjects).toBe(0);
    expect(dashRes.body.stats.totalDeployments).toBe(0);
    expect(dashRes.body.stats.totalIncidents).toBe(0);
    expect(dashRes.body.stats.trendData).toEqual([]);

    // 4. Create first generic project
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', newUserCookie)
      .send({
        name: 'Customer Portal API',
        description: 'REST and GraphQL services for client accounts.',
        environment: 'PRODUCTION',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.project.name).toBe('Customer Portal API');
    const newProjId = createRes.body.project.id;

    // 5. Verify projects list now contains only their project
    const projRes2 = await request(app)
      .get('/api/projects')
      .set('Cookie', newUserCookie);

    expect(projRes2.status).toBe(200);
    expect(projRes2.body.projects.length).toBe(1);
    expect(projRes2.body.projects[0].id).toBe(newProjId);

    // 6. Verify user cannot access other projects created earlier
    const unauthorizedProjRes = await request(app)
      .get(`/api/projects/${createdProjectId}`)
      .set('Cookie', newUserCookie);

    expect(unauthorizedProjRes.status).toBe(403);
  });

  // 23. Multi-User Workspace Isolation (User A vs User B) & Collaboration
  it('Verifies complete workspace isolation between User A and User B, and explicit collaboration', async () => {
    const emailA = `usera_${Date.now()}@example.com`;
    const emailB = `userb_${Date.now()}@example.com`;

    // 1. Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice Engineer', email: emailA, password: 'password123' });
    const cookieA = resA.headers['set-cookie'][0];
    const userA = resA.body.user;

    // Verify User A has 0 projects, 0 deployments, 0 incidents
    const projResA0 = await request(app).get('/api/projects').set('Cookie', cookieA);
    expect(projResA0.body.projects).toEqual([]);

    // User A creates Project A
    const createProjARes = await request(app)
      .post('/api/projects')
      .set('Cookie', cookieA)
      .send({
        name: 'Project Alpha Gateway',
        description: 'Private core gateway for User A',
        environment: 'PRODUCTION',
      });
    const projectAId = createProjARes.body.project.id;

    // User A records a deployment and creates an incident in Project A
    const depResA = await request(app)
      .post(`/api/projects/${projectAId}/deployments`)
      .set('Cookie', cookieA)
      .send({
        environment: 'PRODUCTION',
        version: 'v1.0.0-alpha',
        commitSha: 'abc1234',
        branch: 'main',
        status: 'SUCCESSFUL',
      });
    const depAId = depResA.body.deployment.id;

    const incResA = await request(app)
      .post(`/api/projects/${projectAId}/incidents`)
      .set('Cookie', cookieA)
      .send({
        title: 'Redis Connection Timeout on Alpha Gateway',
        description: 'Connection pool saturated under burst traffic',
        severity: 'HIGH',
        status: 'OPEN',
      });
    const incAId = incResA.body.incident.id;

    // User A comments on the incident
    await request(app)
      .post(`/api/incidents/${incAId}/comments`)
      .set('Cookie', cookieA)
      .send({ content: 'Investigating socket pool contention' });

    // 2. Register User B independently
    const resB = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob Architect', email: emailB, password: 'password123' });
    const cookieB = resB.headers['set-cookie'][0];
    const userB = resB.body.user;

    // Verify User B starts with 0 projects
    const projResB0 = await request(app).get('/api/projects').set('Cookie', cookieB);
    expect(projResB0.body.projects).toEqual([]);

    // Verify User B overview has 0 stats and empty trends
    const overviewB = await request(app).get('/api/dashboard/overview').set('Cookie', cookieB);
    expect(overviewB.body.stats.totalProjects).toBe(0);
    expect(overviewB.body.stats.totalDeployments).toBe(0);
    expect(overviewB.body.stats.totalIncidents).toBe(0);

    // Verify User B CANNOT access Project A
    const getProjAB = await request(app).get(`/api/projects/${projectAId}`).set('Cookie', cookieB);
    expect(getProjAB.status).toBe(403);

    // Verify User B CANNOT access Project A deployments or incidents
    const getDepAB = await request(app).get(`/api/deployments/${depAId}`).set('Cookie', cookieB);
    expect(getDepAB.status).toBe(403);

    const getIncAB = await request(app).get(`/api/incidents/${incAId}`).set('Cookie', cookieB);
    expect(getIncAB.status).toBe(403);

    const getIncCommAB = await request(app).get(`/api/incidents/${incAId}/comments`).set('Cookie', cookieB);
    expect(getIncCommAB.status).toBe(403);

    // Verify User B CANNOT mutate Project A
    const mutateIncAB = await request(app)
      .patch(`/api/incidents/${incAId}`)
      .set('Cookie', cookieB)
      .send({ title: 'Hacked by Bob' });
    expect(mutateIncAB.status).toBe(403);

    // 3. User B creates Project B
    const createProjBRes = await request(app)
      .post('/api/projects')
      .set('Cookie', cookieB)
      .send({
        name: 'Project Beta Ingestion',
        description: 'User B private service',
        environment: 'STAGING',
      });
    const projectBId = createProjBRes.body.project.id;

    // User B now sees ONLY Project B
    const projResB1 = await request(app).get('/api/projects').set('Cookie', cookieB);
    expect(projResB1.body.projects.length).toBe(1);
    expect(projResB1.body.projects[0].id).toBe(projectBId);

    // User A now sees ONLY Project A
    const projResA1 = await request(app).get('/api/projects').set('Cookie', cookieA);
    expect(projResA1.body.projects.length).toBe(1);
    expect(projResA1.body.projects[0].id).toBe(projectAId);

    // 4. Authorized Collaboration: User A adds User B as DEVELOPER to Project A
    const addMemberRes = await request(app)
      .post(`/api/projects/${projectAId}/members`)
      .set('Cookie', cookieA)
      .send({
        email: emailB,
        role: 'DEVELOPER',
      });
    expect(addMemberRes.status).toBe(201);

    // Now User B CAN see Project A
    const projResB2 = await request(app).get('/api/projects').set('Cookie', cookieB);
    expect(projResB2.body.projects.length).toBe(2);
    expect(projResB2.body.projects.some((p: any) => p.id === projectAId)).toBe(true);

    // Now User B CAN read Project A incident and collaborate by adding a comment
    const commentResB = await request(app)
      .post(`/api/incidents/${incAId}/comments`)
      .set('Cookie', cookieB)
      .send({ content: 'Confirmed pool exhaustion; increased max connections to 50' });
    expect(commentResB.status).toBe(201);

    // 5. User A removes User B from Project A
    const removeRes = await request(app)
      .delete(`/api/projects/${projectAId}/members/${userB.id}`)
      .set('Cookie', cookieA);
    expect(removeRes.status).toBe(200);

    // Once removed, User B is immediately rejected again
    const postRemovalGet = await request(app).get(`/api/projects/${projectAId}`).set('Cookie', cookieB);
    expect(postRemovalGet.status).toBe(403);
  });

  // 24. Test Fixtures and LIVE_RESTART_TEST Isolation
  it('Guarantees test fixtures and LIVE_RESTART_TEST records never leak into normal user queries', async () => {
    const { pgDb } = await import('../src/lib/postgres');

    // Query incidents directly to ensure no uncleaned LIVE_RESTART_TEST records exist in active database
    const leakedRecords = await pgDb.query<any>(
      "SELECT * FROM incidents WHERE title LIKE '%LIVE_RESTART_TEST%';"
    );
    expect(leakedRecords.length).toBe(0);

    // Query project members to ensure no demo project has unexpected non-demo members
    const demoProjectIds = ['prj_vestinex_core', 'prj_auth_sso', 'prj_order_stream'];
    const seedUserIds = ['usr_admin_001', 'usr_dev_002', 'usr_lead_003', 'usr_viewer_004'];

    const invalidMembers = await pgDb.query<any>(
      `SELECT * FROM project_members
       WHERE project_id = ANY($1) AND user_id != ALL($2);`,
      [demoProjectIds, seedUserIds]
    );
    expect(invalidMembers.length).toBe(0);
  });
});
