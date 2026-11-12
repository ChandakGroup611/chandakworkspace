const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkFn() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const fn = await client.query(`
    SELECT p.proname, pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname ILIKE '%user_module%';
  `);
  console.log('functions:', fn.rows);

  const triggers = await client.query(`
    SELECT tgname, relname, proname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE relname = 'user_master';
  `);
  console.log('user_master triggers:', triggers.rows);

  await client.end();
}

checkFn().catch(console.error);
