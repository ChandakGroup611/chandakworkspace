const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT workspace_name, is_deleted, status_id FROM workspaces WHERE workspace_name LIKE '%INFRA%' OR workspace_name LIKE '%IA-%';");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
