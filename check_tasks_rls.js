const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT polname, pg_get_expr(polqual, polrelid) as qual FROM pg_policy WHERE polrelid = 'tasks'::regclass;");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
