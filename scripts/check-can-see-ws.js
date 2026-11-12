const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkCanSeeWorkspace() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const fn = await client.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) as args, pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_see_workspace';
  `);
  console.log('can_see_workspace overloads:', fn.rows.length);
  fn.rows.forEach(r => {
    console.log(`\n--- Args: ${r.args} ---`);
    console.log(r.def);
  });

  await client.end();
}

checkCanSeeWorkspace().catch(console.error);
