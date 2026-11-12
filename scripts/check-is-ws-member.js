const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkIsWorkspaceMember() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const fn = await client.query(`
    SELECT p.proname, pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_workspace_member';
  `);
  console.log('is_workspace_member definition:\n', fn.rows[0]?.def);

  await client.end();
}

checkIsWorkspaceMember().catch(console.error);
