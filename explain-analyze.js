const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Get a user
  const userRes = await client.query('SELECT id FROM user_master LIMIT 1');
  const uid = userRes.rows[0]?.id;

  console.log(`Analyzing for user: ${uid}\n`);

  const queries = {
    "Profile Query": `EXPLAIN ANALYZE SELECT * FROM user_master WHERE id = '${uid}'`,
    "Permissions Query": `EXPLAIN ANALYZE SELECT * FROM user_permissions_snapshot WHERE user_id = '${uid}'`,
    "Workspace Query": `EXPLAIN ANALYZE SELECT * FROM workspaces WHERE workspace_owner_id = '${uid}'`,
    "Task Query": `EXPLAIN ANALYZE SELECT * FROM tasks WHERE assignee_id = '${uid}'`
  };

  for (const [name, sql] of Object.entries(queries)) {
    console.log(`=== ${name} ===`);
    try {
      const res = await client.query(sql);
      res.rows.forEach(r => console.log(r['QUERY PLAN']));
    } catch(e) {
      console.log(e.message);
    }
    console.log('\n');
  }
  
  await client.end();
}
run();
