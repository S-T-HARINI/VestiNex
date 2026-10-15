import path from 'path';
import fs from 'fs';

// Force isolated test database directory so persistence verification NEVER contaminates the live application database
process.env.PGDATA_DIR = 'pgdata_restart_test';
process.env.SEED_DEMO_DATA = 'true';

import { pgDb } from '../lib/postgres';
import { v4 as uuidv4 } from 'uuid';

async function verifyRestart() {
  console.log('[Verification] Step 1: Initializing PostgreSQL database in isolated test storage...');
  await pgDb.init();

  const testId = `inc_live_test_${Date.now()}`;
  const testTag = `LIVE_RESTART_TEST_${Date.now()}`;
  const projectId = 'prj_vestinex_core';
  const userId = 'usr_admin_001';
  const now = new Date().toISOString();

  try {
    console.log(`[Verification] Step 2: Creating test record with ID: ${testId}`);
    await pgDb.query(
      `INSERT INTO incidents (id, project_id, title, description, severity, status, reported_by_id, occurred_at, ingested_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        testId,
        projectId,
        `Verification Test: ${testTag}`,
        'Testing persistence across application restart cycle',
        'LOW',
        'OPEN',
        userId,
        now,
        now,
        now,
        now,
      ]
    );

    console.log('[Verification] Step 3: Simulating application server shutdown...');
    await pgDb.close();

    console.log('[Verification] Step 4: Simulating application server restart and re-initialization...');
    await pgDb.init();

    console.log('[Verification] Step 5: Querying test record after restart...');
    const results = await pgDb.query<any>(
      'SELECT * FROM incidents WHERE id = $1',
      [testId]
    );

    if (results.length === 0) {
      throw new Error(`FAILED: Record ${testId} was not found after restart!`);
    }

    const record = results[0];
    console.log(`[Verification] Successfully retrieved record after restart:`);
    console.log(` - ID: ${record.id}`);
    console.log(` - Title: ${record.title}`);
    console.log(` - Severity: ${record.severity}`);
    console.log(` - Status: ${record.status}`);
    console.log(` - Occurred At: ${record.occurred_at}`);

    console.log('[Verification] SUCCESS: PostgreSQL persistence across restart confirmed!');
  } finally {
    try {
      // Clean up the temporary test record
      await pgDb.query('DELETE FROM incidents WHERE id = $1', [testId]);
      console.log('[Verification] Cleaned up temporary test record.');
    } catch (_) {}
    await pgDb.close();
  }
}

verifyRestart().catch((err) => {
  console.error('[Verification] Error during restart verification:', err);
  process.exit(1);
});
