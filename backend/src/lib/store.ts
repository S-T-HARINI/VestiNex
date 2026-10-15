import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Project,
  ProjectMember,
  Deployment,
  DeploymentStatusHistory,
  CodeChange,
  Incident,
  IncidentStatusHistory,
  IncidentDeploymentLink,
  Comment,
  TimelineEvent,
  AuditLog,
  DeploymentStatus,
  IncidentStatus,
} from '../types';

export class DataStore {
  users: User[] = [];
  projects: Project[] = [];
  projectMembers: ProjectMember[] = [];
  deployments: Deployment[] = [];
  deploymentStatusHistories: DeploymentStatusHistory[] = [];
  codeChanges: CodeChange[] = [];
  incidents: Incident[] = [];
  incidentStatusHistories: IncidentStatusHistory[] = [];
  incidentDeploymentLinks: IncidentDeploymentLink[] = [];
  comments: Comment[] = [];
  timelineEvents: TimelineEvent[] = [];
  auditLogs: AuditLog[] = [];

  private isInitialized = false;

  constructor() {
    this.seed();
  }

  seed() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);

    // 1. Users
    const adminUser: User = {
      id: 'usr_admin_001',
      email: 'admin@vestinex.io',
      name: 'Sarah Chen (Platform Lead)',
      passwordHash,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    };

    const devUser: User = {
      id: 'usr_dev_002',
      email: 'dev@vestinex.io',
      name: 'Alex Rivera (Staff SRE)',
      passwordHash,
      role: 'USER',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      createdAt: new Date('2025-01-02T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
    };

    const leadUser: User = {
      id: 'usr_lead_003',
      email: 'lead@vestinex.io',
      name: 'Marcus Vance (Backend Architect)',
      passwordHash,
      role: 'USER',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      createdAt: new Date('2025-01-03T00:00:00Z'),
      updatedAt: new Date('2025-01-03T00:00:00Z'),
    };

    const viewerUser: User = {
      id: 'usr_viewer_004',
      email: 'viewer@vestinex.io',
      name: 'Elena Rostova (Incident Observer)',
      passwordHash,
      role: 'USER',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      createdAt: new Date('2025-01-04T00:00:00Z'),
      updatedAt: new Date('2025-01-04T00:00:00Z'),
    };

    this.users.push(adminUser, devUser, leadUser, viewerUser);

    // 2. Projects
    const project1: Project = {
      id: 'prj_vestinex_core',
      name: 'Checkout & Payment Engine',
      description: 'High-throughput transactional billing and distributed payment settlement pipeline.',
      repoUrl: 'https://github.com/S-T-HARINI/VestiNex.git',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      createdAt: new Date('2025-01-10T08:00:00Z'),
      updatedAt: new Date('2025-01-10T08:00:00Z'),
    };

    const project2: Project = {
      id: 'prj_auth_sso',
      name: 'Identity & Access Gateway',
      description: 'Zero-trust authorization server, session tokens, and OIDC federated login.',
      repoUrl: 'https://github.com/S-T-HARINI/VestiNex.git',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      createdAt: new Date('2025-01-12T09:30:00Z'),
      updatedAt: new Date('2025-01-12T09:30:00Z'),
    };

    const project3: Project = {
      id: 'prj_order_stream',
      name: 'Order Fulfillment Pipeline',
      description: 'Event-driven inventory synchronization and warehouse dispatch orchestrator.',
      repoUrl: 'https://github.com/S-T-HARINI/VestiNex.git',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      createdAt: new Date('2025-01-15T10:00:00Z'),
      updatedAt: new Date('2025-01-15T10:00:00Z'),
    };

    this.projects.push(project1, project2, project3);

    // Project Members
    this.projectMembers.push(
      { id: 'mem_1', userId: adminUser.id, projectId: project1.id, role: 'OWNER', joinedAt: new Date('2025-01-10T08:00:00Z') },
      { id: 'mem_2', userId: devUser.id, projectId: project1.id, role: 'ADMIN', joinedAt: new Date('2025-01-10T08:30:00Z') },
      { id: 'mem_3', userId: leadUser.id, projectId: project1.id, role: 'DEVELOPER', joinedAt: new Date('2025-01-10T09:00:00Z') },
      { id: 'mem_4', userId: viewerUser.id, projectId: project1.id, role: 'VIEWER', joinedAt: new Date('2025-01-10T09:30:00Z') },
      { id: 'mem_5', userId: adminUser.id, projectId: project2.id, role: 'OWNER', joinedAt: new Date('2025-01-12T09:30:00Z') },
      { id: 'mem_6', userId: devUser.id, projectId: project2.id, role: 'DEVELOPER', joinedAt: new Date('2025-01-12T10:00:00Z') },
      { id: 'mem_7', userId: adminUser.id, projectId: project3.id, role: 'OWNER', joinedAt: new Date('2025-01-15T10:00:00Z') }
    );

    // 3. Deployments for Project 1
    const dep1: Deployment = {
      id: 'dep_prod_v2_4_0',
      projectId: project1.id,
      environment: 'PRODUCTION',
      version: 'v2.4.0',
      commitSha: 'a7b3c9d',
      branch: 'main',
      triggeredById: devUser.id,
      status: 'SUCCESSFUL',
      startedAt: new Date('2025-02-10T14:00:00Z'),
      completedAt: new Date('2025-02-10T14:12:00Z'),
      occurredAt: new Date('2025-02-10T14:00:00Z'),
      ingestedAt: new Date('2025-02-10T14:12:10Z'),
      buildUrl: 'https://ci.vestinex.io/builds/8942',
      commitUrl: 'https://github.com/S-T-HARINI/VestiNex/commit/a7b3c9d',
      releaseNotes: 'Migration to pooled connection tier and Stripe webhook idempotency check.',
      createdAt: new Date('2025-02-10T14:00:00Z'),
      updatedAt: new Date('2025-02-10T14:12:00Z'),
    };

    const dep2: Deployment = {
      id: 'dep_prod_v2_4_1',
      projectId: project1.id,
      environment: 'PRODUCTION',
      version: 'v2.4.1',
      commitSha: 'f82e14a',
      branch: 'main',
      triggeredById: leadUser.id,
      status: 'SUCCESSFUL',
      startedAt: new Date('2025-02-14T09:15:00Z'),
      completedAt: new Date('2025-02-14T09:28:00Z'),
      occurredAt: new Date('2025-02-14T09:15:00Z'),
      ingestedAt: new Date('2025-02-14T09:28:05Z'),
      buildUrl: 'https://ci.vestinex.io/builds/8991',
      commitUrl: 'https://github.com/S-T-HARINI/VestiNex/commit/f82e14a',
      releaseNotes: 'Optimized checkout settlement batch window from 60s to 5s. Added custom retry exponential backoff.',
      createdAt: new Date('2025-02-14T09:15:00Z'),
      updatedAt: new Date('2025-02-14T09:28:00Z'),
    };

    const dep3: Deployment = {
      id: 'dep_prod_v2_4_2_hotfix',
      projectId: project1.id,
      environment: 'PRODUCTION',
      version: 'v2.4.2-hotfix',
      commitSha: 'c19e55b',
      branch: 'hotfix/circuit-breaker',
      triggeredById: devUser.id,
      status: 'SUCCESSFUL',
      startedAt: new Date('2025-02-14T11:45:00Z'),
      completedAt: new Date('2025-02-14T11:54:00Z'),
      occurredAt: new Date('2025-02-14T11:45:00Z'),
      ingestedAt: new Date('2025-02-14T11:54:15Z'),
      buildUrl: 'https://ci.vestinex.io/builds/9004',
      commitUrl: 'https://github.com/S-T-HARINI/VestiNex/commit/c19e55b',
      releaseNotes: 'Restored batch window buffer and enforced circuit breaker on external banking API gateway.',
      createdAt: new Date('2025-02-14T11:45:00Z'),
      updatedAt: new Date('2025-02-14T11:54:00Z'),
    };

    const depStaging: Deployment = {
      id: 'dep_stg_v2_5_0_rc1',
      projectId: project1.id,
      environment: 'STAGING',
      version: 'v2.5.0-rc1',
      commitSha: 'b45c911',
      branch: 'feature/instant-refunds',
      triggeredById: leadUser.id,
      status: 'FAILED',
      startedAt: new Date('2025-02-15T08:00:00Z'),
      completedAt: new Date('2025-02-15T08:09:00Z'),
      occurredAt: new Date('2025-02-15T08:00:00Z'),
      ingestedAt: new Date('2025-02-15T08:09:30Z'),
      buildUrl: 'https://ci.vestinex.io/builds/9012',
      commitUrl: 'https://github.com/S-T-HARINI/VestiNex/commit/b45c911',
      releaseNotes: 'Pre-release build for instant refund automated ledger entries. Failed database schema verification.',
      createdAt: new Date('2025-02-15T08:00:00Z'),
      updatedAt: new Date('2025-02-15T08:09:00Z'),
    };

    this.deployments.push(dep1, dep2, dep3, depStaging);

    // Deployment status histories
    this.deploymentStatusHistories.push(
      {
        id: 'dsh_1',
        deploymentId: dep2.id,
        fromStatus: 'PENDING',
        toStatus: 'RUNNING',
        changedById: leadUser.id,
        note: 'Triggered automated rollout via GitHub Actions workflow #4481.',
        changedAt: new Date('2025-02-14T09:15:00Z'),
      },
      {
        id: 'dsh_2',
        deploymentId: dep2.id,
        fromStatus: 'RUNNING',
        toStatus: 'SUCCESSFUL',
        changedById: leadUser.id,
        note: 'Canary checks passed; 100% traffic shifted to cluster pod v2.4.1.',
        changedAt: new Date('2025-02-14T09:28:00Z'),
      }
    );

    // 4. Code Changes (Commits)
    this.codeChanges.push(
      {
        id: 'commit_1',
        projectId: project1.id,
        deploymentId: dep1.id,
        commitSha: 'a7b3c9d',
        message: 'fix(billing): add redis idempotency token lock before charging customer card',
        author: 'Alex Rivera <alex@vestinex.io>',
        branch: 'main',
        repoUrl: 'https://github.com/S-T-HARINI/VestiNex',
        committedAt: new Date('2025-02-10T13:40:00Z'),
        pullRequestUrl: 'https://github.com/S-T-HARINI/VestiNex/pull/189',
        filesChanged: 'src/services/billing.ts (+42, -6), src/config/redis.ts (+12, -1)',
        createdAt: new Date('2025-02-10T13:40:00Z'),
      },
      {
        id: 'commit_2',
        projectId: project1.id,
        deploymentId: dep2.id,
        commitSha: 'f82e14a',
        message: 'perf(settlement): reduce settlement flush window to 5s & enable immediate retry',
        author: 'Marcus Vance <marcus@vestinex.io>',
        branch: 'main',
        repoUrl: 'https://github.com/S-T-HARINI/VestiNex',
        committedAt: new Date('2025-02-14T08:50:00Z'),
        pullRequestUrl: 'https://github.com/S-T-HARINI/VestiNex/pull/194',
        filesChanged: 'src/workers/settlement.worker.ts (+118, -45), src/constants.ts (+4, -4)',
        createdAt: new Date('2025-02-14T08:50:00Z'),
      },
      {
        id: 'commit_3',
        projectId: project1.id,
        deploymentId: dep3.id,
        commitSha: 'c19e55b',
        message: 'hotfix(resilience): introduce resilient token bucket circuit breaker for upstream provider',
        author: 'Alex Rivera <alex@vestinex.io>',
        branch: 'hotfix/circuit-breaker',
        repoUrl: 'https://github.com/S-T-HARINI/VestiNex',
        committedAt: new Date('2025-02-14T11:30:00Z'),
        pullRequestUrl: 'https://github.com/S-T-HARINI/VestiNex/pull/196',
        filesChanged: 'src/clients/bankingClient.ts (+85, -12), src/workers/settlement.worker.ts (+14, -8)',
        createdAt: new Date('2025-02-14T11:30:00Z'),
      }
    );

    // 5. Incidents
    const inc1: Incident = {
      id: 'inc_prod_502_spike',
      projectId: project1.id,
      title: 'Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint',
      description: 'Beginning 18 minutes post deployment v2.4.1, checkout settlement throughput saturated upstream socket connection pools, resulting in cascading request drops and 14.8% error rate on credit card settlements.',
      severity: 'CRITICAL',
      status: 'RESOLVED',
      reportedById: adminUser.id,
      assignedToId: devUser.id,
      resolvedAt: new Date('2025-02-14T12:05:00Z'),
      resolutionNote: 'Root cause identified: aggressive 5s flush interval overwhelmed the upstream banking partner rate limit without backpressure. Deployed hotfix v2.4.2 with token-bucket circuit breaker. Error rates returned to 0.01%.',
      occurredAt: new Date('2025-02-14T09:46:00Z'),
      ingestedAt: new Date('2025-02-14T09:48:12Z'),
      createdAt: new Date('2025-02-14T09:48:12Z'),
      updatedAt: new Date('2025-02-14T12:05:00Z'),
    };

    const inc2: Incident = {
      id: 'inc_auth_jwt_leak',
      projectId: project2.id,
      title: 'Intermittent Token Validation Rejection across Distributed Gateways',
      description: 'Secondary edge proxy cluster rejecting RS256 token signatures intermittently due to out-of-sync public key cache during rolling key rotation.',
      severity: 'HIGH',
      status: 'INVESTIGATING',
      reportedById: leadUser.id,
      assignedToId: devUser.id,
      resolvedAt: null,
      resolutionNote: null,
      occurredAt: new Date('2025-02-15T06:15:00Z'),
      ingestedAt: new Date('2025-02-15T06:22:45Z'),
      createdAt: new Date('2025-02-15T06:22:45Z'),
      updatedAt: new Date('2025-02-15T07:00:00Z'),
    };

    const inc3: Incident = {
      id: 'inc_queue_backlog',
      projectId: project3.id,
      title: 'Warehouse Dispatch Deadlock on Concurrent Fulfillment Requests',
      description: 'PostgreSQL row-level lock contention on dispatch_orders table when simultaneous webhook events trigger inventory state transitions.',
      severity: 'MEDIUM',
      status: 'OPEN',
      reportedById: devUser.id,
      assignedToId: leadUser.id,
      resolvedAt: null,
      resolutionNote: null,
      occurredAt: new Date('2025-02-15T09:00:00Z'),
      ingestedAt: new Date('2025-02-15T09:02:10Z'),
      createdAt: new Date('2025-02-15T09:02:10Z'),
      updatedAt: new Date('2025-02-15T09:02:10Z'),
    };

    this.incidents.push(inc1, inc2, inc3);

    // Incident Deployment Link (Evidence-based correlation)
    this.incidentDeploymentLinks.push({
      id: 'idl_1',
      incidentId: inc1.id,
      deploymentId: dep2.id,
      confidence: 'high',
      linkedById: devUser.id,
      note: 'Temporal correlation: Incident onset occurred exactly 18 minutes after v2.4.1 completed. Diff analysis confirms batch window reduction modified socket pool contention.',
      createdAt: new Date('2025-02-14T10:10:00Z'),
    });

    // Incident Status Histories
    this.incidentStatusHistories.push(
      {
        id: 'ish_1',
        incidentId: inc1.id,
        fromStatus: 'OPEN',
        toStatus: 'INVESTIGATING',
        changedById: devUser.id,
        note: 'Paging SRE on-call. Correlating gateway metrics with deployment timeline.',
        changedAt: new Date('2025-02-14T09:50:00Z'),
      },
      {
        id: 'ish_2',
        incidentId: inc1.id,
        fromStatus: 'INVESTIGATING',
        toStatus: 'IDENTIFIED',
        changedById: devUser.id,
        note: 'Root cause pinpointed to PR #194 settlement batch window configuration in v2.4.1.',
        changedAt: new Date('2025-02-14T10:20:00Z'),
      },
      {
        id: 'ish_3',
        incidentId: inc1.id,
        fromStatus: 'IDENTIFIED',
        toStatus: 'MONITORING',
        changedById: leadUser.id,
        note: 'Hotfix v2.4.2 released to production. Observing error drop across canary pods.',
        changedAt: new Date('2025-02-14T11:55:00Z'),
      },
      {
        id: 'ish_4',
        incidentId: inc1.id,
        fromStatus: 'MONITORING',
        toStatus: 'RESOLVED',
        changedById: adminUser.id,
        note: 'Incident resolved after 10 consecutive minutes of nominal latency and 0% drop rate.',
        changedAt: new Date('2025-02-14T12:05:00Z'),
      }
    );

    // Incident Comments
    this.comments.push(
      {
        id: 'cmt_1',
        incidentId: inc1.id,
        userId: adminUser.id,
        content: 'DataDog alert fired: 502 rates exceeded 5% threshold across US-East-1 availability zone.',
        createdAt: new Date('2025-02-14T09:48:30Z'),
        updatedAt: new Date('2025-02-14T09:48:30Z'),
      },
      {
        id: 'cmt_2',
        incidentId: inc1.id,
        userId: devUser.id,
        content: 'Checking latest deployment logs. Deployment v2.4.1 completed at 09:28 UTC. The timing aligns with the socket pool ramp.',
        createdAt: new Date('2025-02-14T09:54:10Z'),
        updatedAt: new Date('2025-02-14T09:54:10Z'),
      },
      {
        id: 'cmt_3',
        incidentId: inc1.id,
        userId: leadUser.id,
        content: 'Confirmed. The 5s flush interval in commit f82e14a exhausted our connection pooling budget under peak load. Preparing PR #196 with circuit breaker fallback.',
        createdAt: new Date('2025-02-14T10:15:00Z'),
        updatedAt: new Date('2025-02-14T10:15:00Z'),
      },
      {
        id: 'cmt_4',
        incidentId: inc1.id,
        userId: devUser.id,
        content: 'Hotfix v2.4.2-hotfix deployed and running healthy. Upstream error count reduced to 0.',
        createdAt: new Date('2025-02-14T11:57:00Z'),
        updatedAt: new Date('2025-02-14T11:57:00Z'),
      }
    );

    // 6. Chronological Timeline Events (with deliberate delayed/out-of-order event demonstration)
    this.timelineEvents.push(
      {
        id: 'tle_1',
        projectId: project1.id,
        type: 'PROJECT_CREATED',
        title: 'Project Initialized',
        description: 'Checkout & Payment Engine created under production environment monitoring.',
        metadata: { createdBy: 'Sarah Chen' },
        entityId: project1.id,
        entityType: 'PROJECT',
        occurredAt: new Date('2025-01-10T08:00:00Z'),
        ingestedAt: new Date('2025-01-10T08:00:00Z'),
        createdAt: new Date('2025-01-10T08:00:00Z'),
      },
      {
        id: 'tle_2',
        projectId: project1.id,
        type: 'DEPLOYMENT_CREATED',
        title: 'Deployment v2.4.0 Initiated',
        description: 'Release v2.4.0 started by Alex Rivera on branch main.',
        metadata: { version: 'v2.4.0', commit: 'a7b3c9d', branch: 'main' },
        entityId: dep1.id,
        entityType: 'DEPLOYMENT',
        occurredAt: new Date('2025-02-10T14:00:00Z'),
        ingestedAt: new Date('2025-02-10T14:00:05Z'),
        createdAt: new Date('2025-02-10T14:00:00Z'),
      },
      {
        id: 'tle_3',
        projectId: project1.id,
        type: 'DEPLOYMENT_STATUS_CHANGED',
        title: 'Deployment v2.4.0 Successful',
        description: 'Production deployment completed without health check failures.',
        metadata: { version: 'v2.4.0', status: 'SUCCESSFUL' },
        entityId: dep1.id,
        entityType: 'DEPLOYMENT',
        occurredAt: new Date('2025-02-10T14:12:00Z'),
        ingestedAt: new Date('2025-02-10T14:12:10Z'),
        createdAt: new Date('2025-02-10T14:12:00Z'),
      },
      {
        id: 'tle_4',
        projectId: project1.id,
        type: 'CODE_CHANGE_RECORDED',
        title: 'Commit f82e14a Pushed',
        description: 'perf(settlement): reduce settlement flush window to 5s & enable immediate retry',
        metadata: { author: 'Marcus Vance', sha: 'f82e14a' },
        entityId: 'commit_2',
        entityType: 'CODE_CHANGE',
        occurredAt: new Date('2025-02-14T08:50:00Z'),
        ingestedAt: new Date('2025-02-14T08:50:15Z'),
        createdAt: new Date('2025-02-14T08:50:00Z'),
      },
      {
        id: 'tle_5',
        projectId: project1.id,
        type: 'DEPLOYMENT_CREATED',
        title: 'Deployment v2.4.1 Initiated',
        description: 'Release v2.4.1 started by Marcus Vance on branch main.',
        metadata: { version: 'v2.4.1', commit: 'f82e14a', branch: 'main' },
        entityId: dep2.id,
        entityType: 'DEPLOYMENT',
        occurredAt: new Date('2025-02-14T09:15:00Z'),
        ingestedAt: new Date('2025-02-14T09:15:02Z'),
        createdAt: new Date('2025-02-14T09:15:00Z'),
      },
      {
        id: 'tle_6',
        projectId: project1.id,
        type: 'DEPLOYMENT_STATUS_CHANGED',
        title: 'Deployment v2.4.1 Completed',
        description: 'All 8 pod replicas upgraded. 100% traffic shifted.',
        metadata: { version: 'v2.4.1', status: 'SUCCESSFUL' },
        entityId: dep2.id,
        entityType: 'DEPLOYMENT',
        occurredAt: new Date('2025-02-14T09:28:00Z'),
        ingestedAt: new Date('2025-02-14T09:28:05Z'),
        createdAt: new Date('2025-02-14T09:28:00Z'),
      },
      {
        id: 'tle_7',
        projectId: project1.id,
        type: 'INCIDENT_CREATED',
        title: 'CRITICAL Incident: Elevated 502 Spike on /api/v2/settle',
        description: 'Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint detected.',
        metadata: { severity: 'CRITICAL', reportedBy: 'Sarah Chen' },
        entityId: inc1.id,
        entityType: 'INCIDENT',
        occurredAt: new Date('2025-02-14T09:46:00Z'),
        // Ingestion delay demonstration: Event occurred at 09:46, telemetry pipeline ingested at 09:48:12 (2m 12s delay)
        ingestedAt: new Date('2025-02-14T09:48:12Z'),
        createdAt: new Date('2025-02-14T09:48:12Z'),
      },
      {
        id: 'tle_8',
        projectId: project1.id,
        type: 'INCIDENT_STATUS_CHANGED',
        title: 'Incident Transitioned to INVESTIGATING',
        description: 'Investigation underway by Alex Rivera.',
        metadata: { from: 'OPEN', to: 'INVESTIGATING', changedBy: 'Alex Rivera' },
        entityId: inc1.id,
        entityType: 'INCIDENT',
        occurredAt: new Date('2025-02-14T09:50:00Z'),
        ingestedAt: new Date('2025-02-14T09:50:02Z'),
        createdAt: new Date('2025-02-14T09:50:00Z'),
      },
      {
        // Out-of-order telemetry demonstration: Network metric packet occurred earlier (09:47:00), but was delayed and arrived late (10:05:00)
        id: 'tle_9',
        projectId: project1.id,
        type: 'INCIDENT_STATUS_CHANGED',
        title: 'Gateway Connection Pool Saturation Threshold Breached (Delayed Ingest)',
        description: 'Socket pool queue depth reached 1024 pending connections across AZ-East.',
        metadata: { delayedLog: true, queueDepth: 1024, lagSeconds: 1080 },
        entityId: inc1.id,
        entityType: 'INCIDENT',
        occurredAt: new Date('2025-02-14T09:47:00Z'),
        ingestedAt: new Date('2025-02-14T10:05:00Z'),
        createdAt: new Date('2025-02-14T10:05:00Z'),
      },
      {
        id: 'tle_10',
        projectId: project1.id,
        type: 'INCIDENT_STATUS_CHANGED',
        title: 'Incident Transitioned to IDENTIFIED',
        description: 'Root cause confirmed in deployment v2.4.1 settlement batch config.',
        metadata: { from: 'INVESTIGATING', to: 'IDENTIFIED', changedBy: 'Alex Rivera' },
        entityId: inc1.id,
        entityType: 'INCIDENT',
        occurredAt: new Date('2025-02-14T10:20:00Z'),
        ingestedAt: new Date('2025-02-14T10:20:05Z'),
        createdAt: new Date('2025-02-14T10:20:00Z'),
      },
      {
        id: 'tle_11',
        projectId: project1.id,
        type: 'DEPLOYMENT_CREATED',
        title: 'Hotfix Deployment v2.4.2-hotfix Initiated',
        description: 'Rollout of circuit breaker token bucket patch.',
        metadata: { version: 'v2.4.2-hotfix', commit: 'c19e55b' },
        entityId: dep3.id,
        entityType: 'DEPLOYMENT',
        occurredAt: new Date('2025-02-14T11:45:00Z'),
        ingestedAt: new Date('2025-02-14T11:45:05Z'),
        createdAt: new Date('2025-02-14T11:45:00Z'),
      },
      {
        id: 'tle_12',
        projectId: project1.id,
        type: 'DEPLOYMENT_STATUS_CHANGED',
        title: 'Hotfix Deployment v2.4.2-hotfix Succeeded',
        description: 'Hotfix live in production. Metric recovery observed.',
        metadata: { version: 'v2.4.2-hotfix', status: 'SUCCESSFUL' },
        entityId: dep3.id,
        entityType: 'DEPLOYMENT',
        occurredAt: new Date('2025-02-14T11:54:00Z'),
        ingestedAt: new Date('2025-02-14T11:54:15Z'),
        createdAt: new Date('2025-02-14T11:54:00Z'),
      },
      {
        id: 'tle_13',
        projectId: project1.id,
        type: 'INCIDENT_RESOLVED',
        title: 'Incident Resolved: Elevated 502 Spike on /api/v2/settle',
        description: 'Error rate stabilized to baseline. Post-incident review scheduled.',
        metadata: { status: 'RESOLVED', resolvedBy: 'Sarah Chen', mttrMinutes: 139 },
        entityId: inc1.id,
        entityType: 'INCIDENT',
        occurredAt: new Date('2025-02-14T12:05:00Z'),
        ingestedAt: new Date('2025-02-14T12:05:02Z'),
        createdAt: new Date('2025-02-14T12:05:00Z'),
      }
    );

    // 7. Audit Logs
    this.auditLogs.push(
      {
        id: 'aud_1',
        userId: adminUser.id,
        action: 'PROJECT_CREATE',
        entityType: 'PROJECT',
        entityId: project1.id,
        changes: { name: project1.name, environment: project1.environment },
        ipAddress: '192.168.1.100',
        createdAt: new Date('2025-01-10T08:00:00Z'),
      },
      {
        id: 'aud_2',
        userId: devUser.id,
        action: 'DEPLOYMENT_STATUS_UPDATE',
        entityType: 'DEPLOYMENT',
        entityId: dep2.id,
        changes: { fromStatus: 'RUNNING', toStatus: 'SUCCESSFUL' },
        ipAddress: '192.168.1.102',
        createdAt: new Date('2025-02-14T09:28:00Z'),
      },
      {
        id: 'aud_3',
        userId: adminUser.id,
        action: 'INCIDENT_CREATE',
        entityType: 'INCIDENT',
        entityId: inc1.id,
        changes: { severity: 'CRITICAL', title: inc1.title },
        ipAddress: '192.168.1.100',
        createdAt: new Date('2025-02-14T09:48:12Z'),
      },
      {
        id: 'aud_4',
        userId: devUser.id,
        action: 'INCIDENT_DEPLOYMENT_LINK',
        entityType: 'INCIDENT',
        entityId: inc1.id,
        changes: { deploymentId: dep2.id, confidence: 'high' },
        ipAddress: '192.168.1.102',
        createdAt: new Date('2025-02-14T10:10:00Z'),
      }
    );
  }

  // ── Helper Queries ───────────────────────────────────────
  findUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findProjectById(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  getUserProjects(userId: string): (Project & { role: string })[] {
    const memberships = this.projectMembers.filter((m) => m.userId === userId);
    return memberships
      .map((m) => {
        const project = this.projects.find((p) => p.id === m.projectId);
        if (!project) return null;
        return { ...project, role: m.role };
      })
      .filter(Boolean) as (Project & { role: string })[];
  }

  getProjectMemberRole(userId: string, projectId: string) {
    const member = this.projectMembers.find((m) => m.userId === userId && m.projectId === projectId);
    return member?.role || null;
  }
}

export const db = new DataStore();
