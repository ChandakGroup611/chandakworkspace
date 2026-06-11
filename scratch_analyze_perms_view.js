const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });
(async () => {
  await client.connect();
  const res = await client.query("SELECT pg_get_viewdef('user_permissions_snapshot');");
  console.log(res.rows[0].pg_get_viewdef);
  
  // also run explain analyze on it for a specific user to see if it takes 400ms!
  const userRes = await client.query("SELECT id FROM user_master LIMIT 1;");
  if (userRes.rows.length > 0) {
    const userId = userRes.rows[0].id;
    console.log("Analyzing view performance for user:", userId);
    const analyze = await client.query("EXPLAIN ANALYZE SELECT permission_code FROM user_permissions_snapshot WHERE user_id = $1;", [userId]);
    console.log(analyze.rows.map(r => r['QUERY PLAN']).join('\n'));
  }
  await client.end();
})();
