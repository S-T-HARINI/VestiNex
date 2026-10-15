import { pgDb } from '../lib/postgres';
import { AppError } from '../middleware/errorHandler';

export class DashboardService {
  async getGlobalOverview(userId: string) {
    const projectRows = await pgDb.query<{ id: string }>(
      'SELECT project_id as id FROM project_members WHERE user_id = $1;',
      [userId]
    );
    const projectIds = projectRows.map((p) => p.id);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalDeployments: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        deploymentSuccessRate: 0,
        totalIncidents: 0,
        openIncidents: 0,
        criticalIncidents: 0,
        mttrMinutes: 0,
        trendData: [],
        severityDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      };
    }

    // Dynamic metrics from PostgreSQL
    const deploys = await pgDb.query<any>(
      `SELECT status, count(*) as count FROM deployments WHERE project_id = ANY($1) GROUP BY status;`,
      [projectIds]
    );

    const incidents = await pgDb.query<any>(
      `SELECT status, severity, count(*) as count FROM incidents WHERE project_id = ANY($1) GROUP BY status, severity;`,
      [projectIds]
    );

    // Compute totals
    let totalDeployments = 0;
    let successfulDeployments = 0;
    let failedDeployments = 0;

    deploys.forEach((d) => {
      const c = parseInt(d.count, 10);
      totalDeployments += c;
      if (d.status === 'SUCCESSFUL') successfulDeployments += c;
      if (d.status === 'FAILED') failedDeployments += c;
    });

    let totalIncidents = 0;
    let openIncidents = 0;
    let criticalIncidents = 0;
    const severityDistribution: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

    incidents.forEach((i) => {
      const c = parseInt(i.count, 10);
      totalIncidents += c;
      if (i.status !== 'RESOLVED' && i.status !== 'CLOSED') {
        openIncidents += c;
        if (i.severity === 'CRITICAL') criticalIncidents += c;
      }
      if (severityDistribution[i.severity] !== undefined) {
        severityDistribution[i.severity] += c;
      }
    });

    // Calculate real MTTR in minutes
    const mttrRows = await pgDb.query<any>(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - occurred_at))/60) as avg_mttr
       FROM incidents
       WHERE project_id = ANY($1) AND resolved_at IS NOT NULL AND status IN ('RESOLVED', 'CLOSED');`,
      [projectIds]
    );

    const rawMttr = mttrRows[0]?.avg_mttr;
    const mttrMinutes = rawMttr ? Math.round(parseFloat(rawMttr)) : 0;

    // Real dynamic trend data grouped by day for past 7 days
    const trendRows = await pgDb.query<any>(
      `SELECT to_char(occurred_at, 'Mon DD') as date,
              COUNT(CASE WHEN entity_type = 'DEPLOYMENT' THEN 1 END) as deployments,
              COUNT(CASE WHEN entity_type = 'INCIDENT' THEN 1 END) as incidents,
              COUNT(CASE WHEN entity_type = 'DEPLOYMENT' AND (metadata->>'status' = 'SUCCESSFUL' OR title ILIKE '%successful%' OR title ILIKE '%succeeded%') THEN 1 END) as successful
       FROM timeline_events
       WHERE project_id = ANY($1) AND occurred_at >= NOW() - INTERVAL '7 days'
       GROUP BY to_char(occurred_at, 'Mon DD'), date_trunc('day', occurred_at)
       ORDER BY date_trunc('day', occurred_at) ASC;`,
      [projectIds]
    );

    const trendData = trendRows.map((r) => ({
      date: r.date,
      deployments: parseInt(r.deployments, 10) || 0,
      incidents: parseInt(r.incidents, 10) || 0,
      successful: parseInt(r.successful, 10) || 0,
    }));

    return {
      totalProjects: projectIds.length,
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      deploymentSuccessRate: totalDeployments > 0 ? Math.round((successfulDeployments / totalDeployments) * 100) : 0,
      totalIncidents,
      openIncidents,
      criticalIncidents,
      mttrMinutes,
      trendData,
      severityDistribution,
    };
  }

  async getProjectDashboard(projectId: string) {
    const projRows = await pgDb.query<any>('SELECT * FROM projects WHERE id = $1 LIMIT 1;', [projectId]);
    if (projRows.length === 0) throw new AppError('Project not found', 404);
    const project = projRows[0];

    // Deploys stats
    const deploys = await pgDb.query<any>(
      `SELECT status, count(*) as count FROM deployments WHERE project_id = $1 GROUP BY status;`,
      [projectId]
    );

    let totalDeployments = 0;
    let successfulDeployments = 0;
    let failedDeployments = 0;
    let rolledBackDeployments = 0;

    deploys.forEach((d) => {
      const c = parseInt(d.count, 10);
      totalDeployments += c;
      if (d.status === 'SUCCESSFUL') successfulDeployments += c;
      if (d.status === 'FAILED') failedDeployments += c;
      if (d.status === 'ROLLED_BACK') rolledBackDeployments += c;
    });

    // Incidents stats
    const incidents = await pgDb.query<any>(
      `SELECT status, severity, count(*) as count FROM incidents WHERE project_id = $1 GROUP BY status, severity;`,
      [projectId]
    );

    let totalIncidents = 0;
    let openIncidents = 0;
    let criticalIncidents = 0;
    const severityDistribution: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

    incidents.forEach((i) => {
      const c = parseInt(i.count, 10);
      totalIncidents += c;
      if (i.status !== 'RESOLVED' && i.status !== 'CLOSED') {
        openIncidents += c;
        if (i.severity === 'CRITICAL') criticalIncidents += c;
      }
      if (severityDistribution[i.severity] !== undefined) {
        severityDistribution[i.severity] += c;
      }
    });

    // MTTR calculation
    const mttrRows = await pgDb.query<any>(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - occurred_at))/60) as avg_mttr
       FROM incidents
       WHERE project_id = $1 AND resolved_at IS NOT NULL AND status IN ('RESOLVED', 'CLOSED');`,
      [projectId]
    );

    const rawMttr = mttrRows[0]?.avg_mttr;
    const mttrMinutes = rawMttr ? Math.round(parseFloat(rawMttr)) : 0;

    // Recent activity (latest 8 timeline events)
    const recentActivity = await pgDb.query<any>(
      `SELECT * FROM timeline_events WHERE project_id = $1 ORDER BY occurred_at DESC LIMIT 8;`,
      [projectId]
    );

    // Recent deployments
    const recentDeployments = await pgDb.query<any>(
      `SELECT * FROM deployments WHERE project_id = $1 ORDER BY occurred_at DESC LIMIT 5;`,
      [projectId]
    );

    // Recent incidents
    const recentIncidents = await pgDb.query<any>(
      `SELECT * FROM incidents WHERE project_id = $1 ORDER BY occurred_at DESC LIMIT 5;`,
      [projectId]
    );

    // Real dynamic trend data
    const trendRows = await pgDb.query<any>(
      `SELECT to_char(occurred_at, 'Mon DD') as date,
              COUNT(CASE WHEN entity_type = 'DEPLOYMENT' THEN 1 END) as deployments,
              COUNT(CASE WHEN entity_type = 'INCIDENT' THEN 1 END) as incidents,
              COUNT(CASE WHEN entity_type = 'DEPLOYMENT' AND (metadata->>'status' = 'SUCCESSFUL' OR title ILIKE '%successful%' OR title ILIKE '%succeeded%') THEN 1 END) as successful
       FROM timeline_events
       WHERE project_id = $1 AND occurred_at >= NOW() - INTERVAL '7 days'
       GROUP BY to_char(occurred_at, 'Mon DD'), date_trunc('day', occurred_at)
       ORDER BY date_trunc('day', occurred_at) ASC;`,
      [projectId]
    );

    const activityTrend = trendRows.map((r) => ({
      date: r.date,
      deployments: parseInt(r.deployments, 10) || 0,
      incidents: parseInt(r.incidents, 10) || 0,
      successful: parseInt(r.successful, 10) || 0,
    }));

    // Dynamic recurring forensic patterns: detect repeated incidents by title or error signature
    const patternRows = await pgDb.query<any>(
      `SELECT title, severity, count(*) as count,
              MIN(occurred_at) as first_observed
       FROM incidents
       WHERE project_id = $1
       GROUP BY title, severity
       HAVING count(*) > 1
       ORDER BY count DESC
       LIMIT 5;`,
      [projectId]
    );

    const recurringPatterns = patternRows.map((p) => ({
      pattern: p.title,
      occurrences: parseInt(p.count, 10),
      severity: p.severity,
      suggestedFix: `Investigate recurring ${p.severity} pattern on "${p.title}" across recent deployment diffs.`,
      firstObserved: p.first_observed ? new Date(p.first_observed).toISOString().split('T')[0] : 'Recent',
    }));

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        repoUrl: project.repo_url,
        environment: project.environment,
        status: project.status,
      },
      summary: {
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        deploymentSuccessRate: totalDeployments > 0 ? Math.round((successfulDeployments / totalDeployments) * 100) : 0,
        totalIncidents,
        openIncidents,
        criticalIncidents,
        mttrMinutes,
      },
      severityDistribution,
      activityTrend,
      recurringPatterns,
      recentActivity,
      recentDeployments: recentDeployments.map((d) => ({
        id: d.id,
        version: d.version,
        environment: d.environment,
        status: d.status,
        commitSha: d.commit_sha,
        branch: d.branch,
        occurredAt: d.occurred_at,
        completedAt: d.completed_at,
      })),
      recentIncidents: recentIncidents.map((i) => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        occurredAt: i.occurred_at,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
