import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import pg, { Pool } from 'pg';
import { PGlite, types as pgliteTypes } from '@electric-sql/pglite';
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

// Force UTC parsing for TIMESTAMP (OID 1114) to prevent local timezone distortion
export const utcTimestampParser = (str: string | null) => {
  if (!str) return null;
  const isoStr = str.includes('T') ? str : str.replace(' ', 'T');
  return new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
};

pg.types.setTypeParser(1114, utcTimestampParser);
if (pgliteTypes?.parsers) {
  pgliteTypes.parsers[1114] = utcTimestampParser;
}

export class PostgresService {
  private pglite: PGlite | null = null;
  private pool: Pool | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // Check if an external PostgreSQL instance is specified and reachable
      const databaseUrl = process.env.DATABASE_URL;
      let connectedToExternal = false;

      if (databaseUrl && !databaseUrl.includes('placeholder')) {
        let testPool: Pool | null = null;
        try {
          testPool = new Pool({
            connectionString: databaseUrl,
            connectionTimeoutMillis: 1000,
          });
          testPool.on('error', () => {});
          await testPool.query('SELECT 1;');
          this.pool = testPool;
          connectedToExternal = true;
          console.log('[PostgreSQL] Connected successfully to external PostgreSQL server.');
        } catch (err) {
          connectedToExternal = false;
          if (testPool) {
            try {
              await testPool.end();
            } catch (_) {}
          }
        }
      }

      if (!connectedToExternal) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            '[PostgreSQL Fatal Error] In production, VestiNex requires a valid, reachable external PostgreSQL database via DATABASE_URL. Silent fallback to embedded local storage is prohibited in production.'
          );
        }
        // Use genuine in-process PostgreSQL 16 engine with disk persistence in ./pgdata
        // For automated tests and verification scripts, use an isolated directory to avoid polluting user workspace
        const defaultDir = process.env.NODE_ENV === 'test' ? 'pgdata_test' : 'pgdata';
        const dataDir = path.resolve(process.cwd(), process.env.PGDATA_DIR || defaultDir);
        this.pglite = new PGlite(dataDir, {
          parsers: {
            1114: utcTimestampParser,
          },
        });
        console.log(`[PostgreSQL] Initialized persistent PostgreSQL 16 engine at ${dataDir}`);
      }

      // Mark initialized now to allow internal query/exec calls during migration & seeding
      this.isInitialized = true;

      // Apply the official Prisma migration DDL to guarantee schema & constraints
      await this.applyMigration();

      // Seed database if empty
      await this.seedIfEmpty();
    })();

    return this.initPromise;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.init();
    if (this.pool) {
      const res = await this.pool.query(sql, params);
      return res.rows as T[];
    } else if (this.pglite) {
      const res = await this.pglite.query(sql, params);
      return res.rows as T[];
    }
    throw new Error('Database not initialized');
  }

  async exec(sql: string): Promise<void> {
    await this.init();
    if (this.pool) {
      await this.pool.query(sql);
    } else if (this.pglite) {
      await this.pglite.exec(sql);
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    if (this.pglite) {
      await this.pglite.close();
      this.pglite = null;
    }
    this.isInitialized = false;
    this.initPromise = null;
  }

  private async applyMigration() {
    try {
      // Check if migration has already been applied
      const check = await this.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' LIMIT 1;"
      );
      if (check.length > 0) {
        return; // Already initialized
      }

      // Read migration.sql
      const migrationPaths = [
        path.resolve(process.cwd(), '../prisma/migrations/20250215000000_init/migration.sql'),
        path.resolve(process.cwd(), 'prisma/migrations/20250215000000_init/migration.sql'),
      ];

      let sql = '';
      for (const p of migrationPaths) {
        if (fs.existsSync(p)) {
          sql = fs.readFileSync(p, 'utf8');
          break;
        }
      }

      if (sql) {
        await this.exec(sql);
        console.log('[PostgreSQL Migration] Successfully applied 20250215000000_init schema DDL.');
      }
    } catch (err: any) {
      console.error('[PostgreSQL Migration Error]:', err.message);
    }
  }

  private async seedIfEmpty() {
    try {
      const userCount = await this.query('SELECT count(*) as count FROM users;');
      if (userCount.length > 0 && parseInt(userCount[0].count, 10) > 0) {
        return; // Already seeded
      }

      if (process.env.SEED_DEMO_DATA === 'false') {
        console.log('[PostgreSQL Seed] Demo data seeding skipped (SEED_DEMO_DATA=false).');
        return;
      }

      console.log('[PostgreSQL Seed] Seeding initial forensic demonstration data...');
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('password123', salt);

      // 1. Users
      await this.query(
        `INSERT INTO users (id, email, name, password_hash, role, avatar_url, created_at, updated_at) VALUES
        ('usr_admin_001', 'admin@vestinex.io', 'Sarah Chen (Platform Lead)', $1, 'ADMIN', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z'),
        ('usr_dev_002', 'dev@vestinex.io', 'Alex Rivera (Staff SRE)', $1, 'USER', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '2025-01-02T00:00:00Z', '2025-01-02T00:00:00Z'),
        ('usr_lead_003', 'lead@vestinex.io', 'Marcus Vance (Backend Architect)', $1, 'USER', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '2025-01-03T00:00:00Z', '2025-01-03T00:00:00Z'),
        ('usr_viewer_004', 'viewer@vestinex.io', 'Elena Rostova (Incident Observer)', $1, 'USER', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '2025-01-04T00:00:00Z', '2025-01-04T00:00:00Z');`,
        [passwordHash]
      );

      // 2. Projects
      await this.query(`
        INSERT INTO projects (id, name, description, repo_url, environment, status, created_at, updated_at) VALUES
        ('prj_vestinex_core', 'Checkout & Payment Engine', 'High-throughput transactional billing and distributed payment settlement pipeline.', 'https://github.com/S-T-HARINI/VestiNex.git', 'PRODUCTION', 'ACTIVE', '2025-01-10T08:00:00Z', '2025-01-10T08:00:00Z'),
        ('prj_auth_sso', 'Identity & Access Gateway', 'Zero-trust authorization server, session tokens, and OIDC federated login.', 'https://github.com/S-T-HARINI/VestiNex.git', 'PRODUCTION', 'ACTIVE', '2025-01-12T09:30:00Z', '2025-01-12T09:30:00Z'),
        ('prj_order_stream', 'Order Fulfillment Pipeline', 'Event-driven inventory synchronization and warehouse dispatch orchestrator.', 'https://github.com/S-T-HARINI/VestiNex.git', 'PRODUCTION', 'ACTIVE', '2025-01-15T10:00:00Z', '2025-01-15T10:00:00Z');
      `);

      // 3. Project Members
      await this.query(`
        INSERT INTO project_members (id, user_id, project_id, role, joined_at) VALUES
        ('mem_1', 'usr_admin_001', 'prj_vestinex_core', 'OWNER', '2025-01-10T08:00:00Z'),
        ('mem_2', 'usr_dev_002', 'prj_vestinex_core', 'ADMIN', '2025-01-10T08:30:00Z'),
        ('mem_3', 'usr_lead_003', 'prj_vestinex_core', 'DEVELOPER', '2025-01-10T09:00:00Z'),
        ('mem_4', 'usr_viewer_004', 'prj_vestinex_core', 'VIEWER', '2025-01-10T09:30:00Z'),
        ('mem_5', 'usr_admin_001', 'prj_auth_sso', 'OWNER', '2025-01-12T09:30:00Z'),
        ('mem_6', 'usr_dev_002', 'prj_auth_sso', 'DEVELOPER', '2025-01-12T10:00:00Z'),
        ('mem_7', 'usr_admin_001', 'prj_order_stream', 'OWNER', '2025-01-15T10:00:00Z');
      `);

      // 4. Deployments
      await this.query(`
        INSERT INTO deployments (id, project_id, environment, version, commit_sha, branch, triggered_by_id, status, started_at, completed_at, occurred_at, ingested_at, build_url, commit_url, release_notes, created_at, updated_at) VALUES
        ('dep_prod_v2_4_0', 'prj_vestinex_core', 'PRODUCTION', 'v2.4.0', 'a7b3c9d', 'main', 'usr_dev_002', 'SUCCESSFUL', '2025-02-10T14:00:00Z', '2025-02-10T14:12:00Z', '2025-02-10T14:00:00Z', '2025-02-10T14:12:10Z', 'https://ci.vestinex.io/builds/8942', 'https://github.com/S-T-HARINI/VestiNex/commit/a7b3c9d', 'Migration to pooled connection tier and Stripe webhook idempotency check.', '2025-02-10T14:00:00Z', '2025-02-10T14:12:00Z'),
        ('dep_prod_v2_4_1', 'prj_vestinex_core', 'PRODUCTION', 'v2.4.1', 'f82e14a', 'main', 'usr_lead_003', 'SUCCESSFUL', '2025-02-14T09:15:00Z', '2025-02-14T09:28:00Z', '2025-02-14T09:15:00Z', '2025-02-14T09:28:05Z', 'https://ci.vestinex.io/builds/8991', 'https://github.com/S-T-HARINI/VestiNex/commit/f82e14a', 'Optimized checkout settlement batch window from 60s to 5s. Added custom retry exponential backoff.', '2025-02-14T09:15:00Z', '2025-02-14T09:28:00Z'),
        ('dep_prod_v2_4_2_hotfix', 'prj_vestinex_core', 'PRODUCTION', 'v2.4.2-hotfix', 'c19e55b', 'hotfix/circuit-breaker', 'usr_dev_002', 'SUCCESSFUL', '2025-02-14T11:45:00Z', '2025-02-14T11:54:00Z', '2025-02-14T11:45:00Z', '2025-02-14T11:54:15Z', 'https://ci.vestinex.io/builds/9004', 'https://github.com/S-T-HARINI/VestiNex/commit/c19e55b', 'Restored batch window buffer and enforced circuit breaker on external banking API gateway.', '2025-02-14T11:45:00Z', '2025-02-14T11:54:00Z'),
        ('dep_stg_v2_5_0_rc1', 'prj_vestinex_core', 'STAGING', 'v2.5.0-rc1', 'b45c911', 'feature/instant-refunds', 'usr_lead_003', 'FAILED', '2025-02-15T08:00:00Z', '2025-02-15T08:09:00Z', '2025-02-15T08:00:00Z', '2025-02-15T08:09:30Z', 'https://ci.vestinex.io/builds/9012', 'https://github.com/S-T-HARINI/VestiNex/commit/b45c911', 'Pre-release build for instant refund automated ledger entries. Failed database schema verification.', '2025-02-15T08:00:00Z', '2025-02-15T08:09:00Z');
      `);

      // 5. Deployment Status History
      await this.query(`
        INSERT INTO deployment_status_history (id, deployment_id, from_status, to_status, changed_by_id, note, changed_at) VALUES
        ('dsh_1', 'dep_prod_v2_4_1', 'PENDING', 'RUNNING', 'usr_lead_003', 'Triggered automated rollout via GitHub Actions workflow #4481.', '2025-02-14T09:15:00Z'),
        ('dsh_2', 'dep_prod_v2_4_1', 'RUNNING', 'SUCCESSFUL', 'usr_lead_003', 'Canary checks passed; 100% traffic shifted to cluster pod v2.4.1.', '2025-02-14T09:28:00Z');
      `);

      // 6. Code Changes
      await this.query(`
        INSERT INTO code_changes (id, project_id, deployment_id, commit_sha, message, author, branch, repo_url, committed_at, pull_request_url, files_changed, created_at) VALUES
        ('commit_1', 'prj_vestinex_core', 'dep_prod_v2_4_0', 'a7b3c9d', 'fix(billing): add redis idempotency token lock before charging customer card', 'Alex Rivera <alex@vestinex.io>', 'main', 'https://github.com/S-T-HARINI/VestiNex', '2025-02-10T13:40:00Z', 'https://github.com/S-T-HARINI/VestiNex/pull/189', 'src/services/billing.ts (+42, -6), src/config/redis.ts (+12, -1)', '2025-02-10T13:40:00Z'),
        ('commit_2', 'prj_vestinex_core', 'dep_prod_v2_4_1', 'f82e14a', 'perf(settlement): reduce settlement flush window to 5s & enable immediate retry', 'Marcus Vance <marcus@vestinex.io>', 'main', 'https://github.com/S-T-HARINI/VestiNex', '2025-02-14T08:50:00Z', 'https://github.com/S-T-HARINI/VestiNex/pull/194', 'src/workers/settlement.worker.ts (+118, -45), src/constants.ts (+4, -4)', '2025-02-14T08:50:00Z'),
        ('commit_3', 'prj_vestinex_core', 'dep_prod_v2_4_2_hotfix', 'c19e55b', 'hotfix(resilience): introduce resilient token bucket circuit breaker for upstream provider', 'Alex Rivera <alex@vestinex.io>', 'hotfix/circuit-breaker', 'https://github.com/S-T-HARINI/VestiNex', '2025-02-14T11:30:00Z', 'https://github.com/S-T-HARINI/VestiNex/pull/196', 'src/clients/bankingClient.ts (+85, -12), src/workers/settlement.worker.ts (+14, -8)', '2025-02-14T11:30:00Z');
      `);

      // 7. Incidents
      await this.query(`
        INSERT INTO incidents (id, project_id, title, description, severity, status, reported_by_id, assigned_to_id, resolved_at, resolution_note, occurred_at, ingested_at, created_at, updated_at) VALUES
        ('inc_prod_502_spike', 'prj_vestinex_core', 'Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint', 'Beginning 18 minutes post deployment v2.4.1, checkout settlement throughput saturated upstream socket connection pools, resulting in cascading request drops and 14.8% error rate on credit card settlements.', 'CRITICAL', 'RESOLVED', 'usr_admin_001', 'usr_dev_002', '2025-02-14T12:05:00Z', 'Root cause identified: aggressive 5s flush interval overwhelmed the upstream banking partner rate limit without backpressure. Deployed hotfix v2.4.2 with token-bucket circuit breaker. Error rates returned to 0.01%.', '2025-02-14T09:46:00Z', '2025-02-14T09:48:12Z', '2025-02-14T09:48:12Z', '2025-02-14T12:05:00Z'),
        ('inc_auth_jwt_leak', 'prj_auth_sso', 'Intermittent Token Validation Rejection across Distributed Gateways', 'Secondary edge proxy cluster rejecting RS256 token signatures intermittently due to out-of-sync public key cache during rolling key rotation.', 'HIGH', 'INVESTIGATING', 'usr_lead_003', 'usr_dev_002', NULL, NULL, '2025-02-15T06:15:00Z', '2025-02-15T06:22:45Z', '2025-02-15T06:22:45Z', '2025-02-15T07:00:00Z'),
        ('inc_queue_backlog', 'prj_order_stream', 'Warehouse Dispatch Deadlock on Concurrent Fulfillment Requests', 'PostgreSQL row-level lock contention on dispatch_orders table when simultaneous webhook events trigger inventory state transitions.', 'MEDIUM', 'OPEN', 'usr_dev_002', 'usr_lead_003', NULL, NULL, '2025-02-15T09:00:00Z', '2025-02-15T09:02:10Z', '2025-02-15T09:02:10Z', '2025-02-15T09:02:10Z');
      `);

      // 8. Incident Deployment Links
      await this.query(`
        INSERT INTO incident_deployment_links (id, incident_id, deployment_id, confidence, linked_by_id, note, created_at) VALUES
        ('idl_1', 'inc_prod_502_spike', 'dep_prod_v2_4_1', 'high', 'usr_dev_002', 'Temporal correlation: Incident onset occurred exactly 18 minutes after v2.4.1 completed. Diff analysis confirms batch window reduction modified socket pool contention.', '2025-02-14T10:10:00Z');
      `);

      // 9. Comments
      await this.query(`
        INSERT INTO comments (id, incident_id, user_id, content, created_at, updated_at) VALUES
        ('cmt_1', 'inc_prod_502_spike', 'usr_admin_001', 'DataDog alert fired: 502 rates exceeded 5% threshold across US-East-1 availability zone.', '2025-02-14T09:48:30Z', '2025-02-14T09:48:30Z'),
        ('cmt_2', 'inc_prod_502_spike', 'usr_dev_002', 'Checking latest deployment logs. Deployment v2.4.1 completed at 09:28 UTC. The timing aligns with the socket pool ramp.', '2025-02-14T09:54:10Z', '2025-02-14T09:54:10Z'),
        ('cmt_3', 'inc_prod_502_spike', 'usr_lead_003', 'Confirmed. The 5s flush interval in commit f82e14a exhausted our connection pooling budget under peak load. Preparing PR #196 with circuit breaker fallback.', '2025-02-14T10:15:00Z', '2025-02-14T10:15:00Z'),
        ('cmt_4', 'inc_prod_502_spike', 'usr_dev_002', 'Hotfix v2.4.2-hotfix deployed and running healthy. Upstream error count reduced to 0.', '2025-02-14T11:57:00Z', '2025-02-14T11:57:00Z');
      `);

      // 10. Timeline Events
      await this.query(`
        INSERT INTO timeline_events (id, project_id, type, title, description, metadata, entity_id, entity_type, occurred_at, ingested_at, created_at) VALUES
        ('tle_1', 'prj_vestinex_core', 'PROJECT_CREATED', 'Project Initialized', 'Checkout & Payment Engine created under production environment monitoring.', '{"createdBy": "Sarah Chen"}', 'prj_vestinex_core', 'PROJECT', '2025-01-10T08:00:00Z', '2025-01-10T08:00:00Z', '2025-01-10T08:00:00Z'),
        ('tle_2', 'prj_vestinex_core', 'DEPLOYMENT_CREATED', 'Deployment v2.4.0 Initiated', 'Release v2.4.0 started by Alex Rivera on branch main.', '{"version": "v2.4.0", "commit": "a7b3c9d", "branch": "main"}', 'dep_prod_v2_4_0', 'DEPLOYMENT', '2025-02-10T14:00:00Z', '2025-02-10T14:00:05Z', '2025-02-10T14:00:00Z'),
        ('tle_3', 'prj_vestinex_core', 'DEPLOYMENT_STATUS_CHANGED', 'Deployment v2.4.0 Successful', 'Production deployment completed without health check failures.', '{"version": "v2.4.0", "status": "SUCCESSFUL"}', 'dep_prod_v2_4_0', 'DEPLOYMENT', '2025-02-10T14:12:00Z', '2025-02-10T14:12:10Z', '2025-02-10T14:12:00Z'),
        ('tle_4', 'prj_vestinex_core', 'CODE_CHANGE_RECORDED', 'Commit f82e14a Pushed', 'perf(settlement): reduce settlement flush window to 5s & enable immediate retry', '{"author": "Marcus Vance", "sha": "f82e14a"}', 'commit_2', 'CODE_CHANGE', '2025-02-14T08:50:00Z', '2025-02-14T08:50:15Z', '2025-02-14T08:50:00Z'),
        ('tle_5', 'prj_vestinex_core', 'DEPLOYMENT_CREATED', 'Deployment v2.4.1 Initiated', 'Release v2.4.1 started by Marcus Vance on branch main.', '{"version": "v2.4.1", "commit": "f82e14a", "branch": "main"}', 'dep_prod_v2_4_1', 'DEPLOYMENT', '2025-02-14T09:15:00Z', '2025-02-14T09:15:02Z', '2025-02-14T09:15:00Z'),
        ('tle_6', 'prj_vestinex_core', 'DEPLOYMENT_STATUS_CHANGED', 'Deployment v2.4.1 Completed', 'All 8 pod replicas upgraded. 100% traffic shifted.', '{"version": "v2.4.1", "status": "SUCCESSFUL"}', 'dep_prod_v2_4_1', 'DEPLOYMENT', '2025-02-14T09:28:00Z', '2025-02-14T09:28:05Z', '2025-02-14T09:28:00Z'),
        ('tle_7', 'prj_vestinex_core', 'INCIDENT_CREATED', 'CRITICAL Incident: Elevated 502 Spike on /api/v2/settle', 'Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint detected.', '{"severity": "CRITICAL", "reportedBy": "Sarah Chen"}', 'inc_prod_502_spike', 'INCIDENT', '2025-02-14T09:46:00Z', '2025-02-14T09:48:12Z', '2025-02-14T09:48:12Z'),
        ('tle_8', 'prj_vestinex_core', 'INCIDENT_STATUS_CHANGED', 'Incident Transitioned to INVESTIGATING', 'Investigation underway by Alex Rivera.', '{"from": "OPEN", "to": "INVESTIGATING", "changedBy": "Alex Rivera"}', 'inc_prod_502_spike', 'INCIDENT', '2025-02-14T09:50:00Z', '2025-02-14T09:50:02Z', '2025-02-14T09:50:00Z'),
        ('tle_9', 'prj_vestinex_core', 'INCIDENT_STATUS_CHANGED', 'Gateway Connection Pool Saturation Threshold Breached (Delayed Ingest)', 'Socket pool queue depth reached 1024 pending connections across AZ-East.', '{"delayedLog": true, "queueDepth": 1024, "lagSeconds": 1080}', 'inc_prod_502_spike', 'INCIDENT', '2025-02-14T09:47:00Z', '2025-02-14T10:05:00Z', '2025-02-14T10:05:00Z'),
        ('tle_10', 'prj_vestinex_core', 'INCIDENT_STATUS_CHANGED', 'Incident Transitioned to IDENTIFIED', 'Root cause confirmed in deployment v2.4.1 settlement batch config.', '{"from": "INVESTIGATING", "to": "IDENTIFIED", "changedBy": "Alex Rivera"}', 'inc_prod_502_spike', 'INCIDENT', '2025-02-14T10:20:00Z', '2025-02-14T10:20:05Z', '2025-02-14T10:20:00Z'),
        ('tle_11', 'prj_vestinex_core', 'DEPLOYMENT_CREATED', 'Hotfix Deployment v2.4.2-hotfix Initiated', 'Rollout of circuit breaker token bucket patch.', '{"version": "v2.4.2-hotfix", "commit": "c19e55b"}', 'dep_prod_v2_4_2_hotfix', 'DEPLOYMENT', '2025-02-14T11:45:00Z', '2025-02-14T11:45:05Z', '2025-02-14T11:45:00Z'),
        ('tle_12', 'prj_vestinex_core', 'DEPLOYMENT_STATUS_CHANGED', 'Hotfix Deployment v2.4.2-hotfix Succeeded', 'Hotfix live in production. Metric recovery observed.', '{"version": "v2.4.2-hotfix", "status": "SUCCESSFUL"}', 'dep_prod_v2_4_2_hotfix', 'DEPLOYMENT', '2025-02-14T11:54:00Z', '2025-02-14T11:54:15Z', '2025-02-14T11:54:00Z'),
        ('tle_13', 'prj_vestinex_core', 'INCIDENT_RESOLVED', 'Incident Resolved: Elevated 502 Spike on /api/v2/settle', 'Error rate stabilized to baseline. Post-incident review scheduled.', '{"status": "RESOLVED", "resolvedBy": "Sarah Chen", "mttrMinutes": 139}', 'inc_prod_502_spike', 'INCIDENT', '2025-02-14T12:05:00Z', '2025-02-14T12:05:02Z', '2025-02-14T12:05:00Z');
      `);

      // 11. Audit Logs
      await this.query(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address, created_at) VALUES
        ('aud_1', 'usr_admin_001', 'PROJECT_CREATE', 'PROJECT', 'prj_vestinex_core', '{"name": "Checkout & Payment Engine", "environment": "PRODUCTION"}', '192.168.1.100', '2025-01-10T08:00:00Z'),
        ('aud_2', 'usr_dev_002', 'DEPLOYMENT_STATUS_UPDATE', 'DEPLOYMENT', 'dep_prod_v2_4_1', '{"fromStatus": "RUNNING", "toStatus": "SUCCESSFUL"}', '192.168.1.102', '2025-02-14T09:28:00Z'),
        ('aud_3', 'usr_admin_001', 'INCIDENT_CREATE', 'INCIDENT', 'inc_prod_502_spike', '{"severity": "CRITICAL", "title": "Elevated 502 Bad Gateway Spike on /api/v2/settle Endpoint"}', '192.168.1.100', '2025-02-14T09:48:12Z'),
        ('aud_4', 'usr_dev_002', 'INCIDENT_DEPLOYMENT_LINK', 'INCIDENT', 'inc_prod_502_spike', '{"deploymentId": "dep_prod_v2_4_1", "confidence": "high"}', '192.168.1.102', '2025-02-14T10:10:00Z');
      `);

      console.log('[PostgreSQL Seed] Initial demo records successfully seeded into PostgreSQL tables.');
    } catch (err: any) {
      console.error('[PostgreSQL Seed Error]:', err.message);
    }
  }

  // Transaction support
  async transaction<T>(callback: (client: PostgresService) => Promise<T>): Promise<T> {
    await this.init();
    await this.exec('BEGIN');
    try {
      const result = await callback(this);
      await this.exec('COMMIT');
      return result;
    } catch (err) {
      await this.exec('ROLLBACK');
      throw err;
    }
  }
}

export const pgDb = new PostgresService();
