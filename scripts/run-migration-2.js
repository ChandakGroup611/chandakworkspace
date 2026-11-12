const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const file = path.join(__dirname, '..', 'supabase', 'migrations', '20261112130000_fix_is_workspace_member_and_clean_rls.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log('Applying migration 20261112130000_fix_is_workspace_member_and_clean_rls.sql...');
  await client.query(sql);
  console.log('Applied successfully!');

  await client.end();
}

run().catch(console.error);
