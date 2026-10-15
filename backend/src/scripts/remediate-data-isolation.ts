import { pgDb } from '../lib/postgres';

async function remediate() {
  console.log('[Remediation] Initializing database connection...');
  await pgDb.init();

  // 1. Remove leaked test incidents
  const testIncs = await pgDb.query<any>("SELECT id, title FROM incidents WHERE title LIKE '%LIVE_RESTART_TEST%';");
  console.log(`[Remediation] Found ${testIncs.length} leaked restart test incidents.`);
  if (testIncs.length > 0) {
    for (const inc of testIncs) {
      await pgDb.query('DELETE FROM incident_status_history WHERE incident_id = $1;', [inc.id]);
      await pgDb.query('DELETE FROM incident_deployment_links WHERE incident_id = $1;', [inc.id]);
      await pgDb.query('DELETE FROM comments WHERE incident_id = $1;', [inc.id]);
      await pgDb.query('DELETE FROM timeline_events WHERE entity_id = $1;', [inc.id]);
      await pgDb.query('DELETE FROM incidents WHERE id = $1;', [inc.id]);
      console.log(`[Remediation] Removed test incident: ${inc.id} (${inc.title})`);
    }
  }

  // 2. Remove accidental auto-assigned project memberships for demo projects
  // The only legitimate demo members for the three demo projects are the seed users:
  // usr_admin_001, usr_dev_002, usr_lead_003, usr_viewer_004
  const demoProjectIds = ['prj_vestinex_core', 'prj_auth_sso', 'prj_order_stream'];
  const seedUserIds = ['usr_admin_001', 'usr_dev_002', 'usr_lead_003', 'usr_viewer_004'];

  const invalidMemberships = await pgDb.query<any>(
    `SELECT pm.id, pm.user_id, pm.project_id, u.email, p.name as "projectName"
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     INNER JOIN projects p ON p.id = pm.project_id
     WHERE pm.project_id = ANY($1) AND pm.user_id != ALL($2);`,
    [demoProjectIds, seedUserIds]
  );

  console.log(`[Remediation] Found ${invalidMemberships.length} invalid auto-assigned memberships to demo projects.`);
  for (const mem of invalidMemberships) {
    await pgDb.query('DELETE FROM project_members WHERE id = $1;', [mem.id]);
    console.log(`[Remediation] Removed membership ${mem.id} for user ${mem.email} from project ${mem.projectName}`);
  }

  // 3. Clean up test projects created by previous test runs (e.g. Telemetry Ingestion Stream created by vitest runs)
  const testProjects = await pgDb.query<any>(
    "SELECT id, name FROM projects WHERE name = 'Telemetry Ingestion Stream';"
  );
  console.log(`[Remediation] Found ${testProjects.length} test projects created by old test runs.`);
  for (const tp of testProjects) {
    await pgDb.query('DELETE FROM timeline_events WHERE project_id = $1;', [tp.id]);
    await pgDb.query('DELETE FROM comments WHERE incident_id IN (SELECT id FROM incidents WHERE project_id = $1);', [tp.id]);
    await pgDb.query('DELETE FROM incident_status_history WHERE incident_id IN (SELECT id FROM incidents WHERE project_id = $1);', [tp.id]);
    await pgDb.query('DELETE FROM incident_deployment_links WHERE incident_id IN (SELECT id FROM incidents WHERE project_id = $1);', [tp.id]);
    await pgDb.query('DELETE FROM incidents WHERE project_id = $1;', [tp.id]);
    await pgDb.query('DELETE FROM deployment_status_history WHERE deployment_id IN (SELECT id FROM deployments WHERE project_id = $1);', [tp.id]);
    await pgDb.query('DELETE FROM code_changes WHERE project_id = $1;', [tp.id]);
    await pgDb.query('DELETE FROM deployments WHERE project_id = $1;', [tp.id]);
    await pgDb.query('DELETE FROM project_members WHERE project_id = $1;', [tp.id]);
    await pgDb.query('DELETE FROM projects WHERE id = $1;', [tp.id]);
    console.log(`[Remediation] Cleaned up test project ${tp.id} (${tp.name})`);
  }

  console.log('[Remediation] SUCCESS: Data remediation completed successfully.');
  await pgDb.close();
}

remediate().catch((err) => {
  console.error('[Remediation] Error:', err);
  process.exit(1);
});
