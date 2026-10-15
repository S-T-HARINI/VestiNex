import { pgDb } from '../lib/postgres';

async function main() {
  await pgDb.init();
  const users = await pgDb.query<{ count: string }>('SELECT count(*) as count FROM users;');
  const projects = await pgDb.query<{ count: string }>('SELECT count(*) as count FROM projects;');
  const deployments = await pgDb.query<{ count: string }>('SELECT count(*) as count FROM deployments;');
  const incidents = await pgDb.query<{ count: string }>('SELECT count(*) as count FROM incidents;');
  const comments = await pgDb.query<{ count: string }>('SELECT count(*) as count FROM comments;');
  const timeline = await pgDb.query<{ count: string }>('SELECT count(*) as count FROM timeline_events;');
  const codeChanges = await pgDb.query<{ count: string }>('SELECT count(*) as count FROM code_changes;');

  console.log('[Persistence Audit Results]');
  console.log(`Users: ${users[0].count}`);
  console.log(`Projects: ${projects[0].count}`);
  console.log(`Deployments: ${deployments[0].count}`);
  console.log(`Incidents: ${incidents[0].count}`);
  console.log(`Comments: ${comments[0].count}`);
  console.log(`Timeline Events: ${timeline[0].count}`);
  console.log(`Code Changes: ${codeChanges[0].count}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
