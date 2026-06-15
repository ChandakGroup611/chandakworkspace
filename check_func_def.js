const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT pg_get_functiondef('hierarchy_task_count'::regproc);");
  console.log(res.rows[0].pg_get_functiondef);
  await client.end();
}
run().catch(console.error);
