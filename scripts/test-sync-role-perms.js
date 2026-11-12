const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSync() {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Pick a non-super-admin role: Standard User (c940b6ee-d774-4ccd-aa8e-06e40135e69c)
  const roleId = 'c940b6ee-d774-4ccd-aa8e-06e40135e69c';

  const current = await client.query("SELECT count(*) FROM role_permissions WHERE role_id = $1;", [roleId]);
  console.log('Current permissions count for Standard User:', current.rows[0].count);

  // Test refreshing snapshot for a user of this role
  const sampleUser = await client.query("SELECT id, email FROM user_master WHERE role_id = $1 LIMIT 1;", [roleId]);
  if (sampleUser.rows.length > 0) {
    const u = sampleUser.rows[0];
    console.log(`Testing refresh_single_user_permissions_snapshot for ${u.email} (${u.id})...`);
    const t0 = Date.now();
    await client.query("SELECT refresh_single_user_permissions_snapshot($1);", [u.id]);
    console.log(`Snapshot refresh took ${Date.now() - t0}ms.`);
  }

  await client.end();
}

testSync().catch(console.error);

