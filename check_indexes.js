const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('workspace_members', 'task_participants', 'tasks');");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
