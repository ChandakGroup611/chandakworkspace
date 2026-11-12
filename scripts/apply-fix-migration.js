const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Applying migration: 20261112120000_fix_super_admin_rbac_and_workspace_members.sql ...');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261112120000_fix_super_admin_rbac_and_workspace_members.sql'), 'utf8');

  await client.query(sql);
  console.log('Migration executed successfully!');

  // Verify is_super_admin() for Anand Mohta
  const anandId = '59fd378e-4ebd-4994-9853-0e3b54a888fb';
  // Simulate auth context by running query with auth.uid() or test function
  const snap = await client.query("SELECT count(*) FROM user_permissions_snapshot WHERE user_id = $1;", [anandId]);
  console.log(`Anand Mohta user_permissions_snapshot count: ${snap.rows[0].count}`);

  const hasSuperAdmin = await client.query("SELECT * FROM user_permissions_snapshot WHERE user_id = $1 AND permission_code = 'SUPER_ADMIN';", [anandId]);
  console.log('Does Anand have SUPER_ADMIN in snapshot?', hasSuperAdmin.rows.length > 0);

  await client.end();
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

