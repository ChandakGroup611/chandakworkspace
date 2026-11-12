const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function inspectPolicies() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const tables = ['workspaces', 'workspace_members', 'tasks', 'user_master', 'user_permissions_snapshot', 'user_roles'];

  for (const table of tables) {
    const res = await client.query(`
      SELECT polname, polcmd, polpermissive, polroles::regrole[], pg_get_expr(polqual, polrelid) as using_expr, pg_get_expr(polwithcheck, polrelid) as with_check
      FROM pg_policy
      WHERE polrelid = $1::regclass;
    `, [table]);
    console.log(`\n=== Table: ${table} (${res.rows.length} policies) ===`);
    res.rows.forEach(p => {
      console.log(`- Policy: ${p.polname} [${p.polcmd}]`);
      console.log(`  USING: ${p.using_expr}`);
      if (p.with_check) console.log(`  WITH CHECK: ${p.with_check}`);
    });
  }

  await client.end();
}

inspectPolicies().catch(console.error);
