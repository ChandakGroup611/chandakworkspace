const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testQuery() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Testing query performance on workspaces & tasks...');
  const t0 = Date.now();

  const ws = await client.query(`
    SELECT id, workspace_name, workspace_code, description, workspace_owner_id, parent_workspace_id,
           company_id, status_id, start_date, end_date, is_active, created_at
    FROM workspaces
    WHERE is_deleted = false
    ORDER BY created_at DESC;
  `);
  console.log(`Workspaces query took ${Date.now() - t0}ms, returned ${ws.rows.length} rows.`);

  const t1 = Date.now();
  const tasks = await client.query(`
    SELECT id, subject, workspace_id, created_by, assigned_to
    FROM tasks
    WHERE is_deleted = false
    LIMIT 100;
  `);
  console.log(`Tasks query took ${Date.now() - t1}ms, returned ${tasks.rows.length} rows.`);

  await client.end();
}

testQuery().catch(console.error);

