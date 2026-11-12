const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const fn = await client.query(`
    SELECT p.proname, pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'refresh_single_user_permissions_snapshot';
  `);
  console.log('def exists:', fn.rows.length > 0);
  console.log(fn.rows[0]?.def);

  await client.end();
}

check().catch(console.error);
