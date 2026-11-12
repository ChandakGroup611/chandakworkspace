const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testRlsBoth() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const anandId = '59fd378e-4ebd-4994-9853-0e3b54a888fb'; // Super Admin
  const standardUserId = 'bfd462a0-bf5d-4e76-98d4-f67c7f25b40f'; // Standard User

  // 1. Test Super Admin
  await client.query("BEGIN;");
  await client.query("SET LOCAL ROLE authenticated;");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true);", [anandId]);
  await client.query("SELECT set_config('request.jwt.claim.role', 'authenticated', true);");

  console.log('--- Testing as authenticated Super Admin ---');
  const ws1 = await client.query("SELECT id, workspace_name FROM workspaces LIMIT 5;");
  console.log(`Workspaces selected: ${ws1.rows.length}`, ws1.rows.map(w => w.workspace_name));

  const wsm1 = await client.query("SELECT count(*) FROM workspace_members;");
  console.log(`workspace_members count: ${wsm1.rows[0].count}`);

  const t1 = await client.query("SELECT count(*) FROM tasks;");
  console.log(`tasks count: ${t1.rows[0].count}`);
  await client.query("ROLLBACK;");

  // 2. Test Standard User
  await client.query("BEGIN;");
  await client.query("SET LOCAL ROLE authenticated;");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true);", [standardUserId]);
  await client.query("SELECT set_config('request.jwt.claim.role', 'authenticated', true);");

  console.log('\n--- Testing as authenticated Standard User ---');
  const ws2 = await client.query("SELECT id, workspace_name FROM workspaces;");
  console.log(`Standard user workspaces visible: ${ws2.rows.length}`, ws2.rows.map(w => w.workspace_name));

  const wsm2 = await client.query("SELECT count(*) FROM workspace_members;");
  console.log(`Standard user workspace_members count: ${wsm2.rows[0].count}`);

  const t2 = await client.query("SELECT count(*) FROM tasks;");
  console.log(`Standard user tasks count: ${t2.rows[0].count}`);
  await client.query("ROLLBACK;");

  await client.end();
}

testRlsBoth().catch(console.error);
