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
});
