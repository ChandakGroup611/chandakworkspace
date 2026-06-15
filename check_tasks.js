const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT is_deleted, COUNT(*) FROM tasks WHERE workspace_id IN (SELECT id FROM workspaces WHERE workspace_name LIKE '%IA-Internal Audit%') GROUP BY is_deleted;");
  console.log('IA-Internal Audit Tasks:', res.rows);
  
  const res2 = await client.query("SELECT is_deleted, COUNT(*) FROM tasks WHERE workspace_id IN (SELECT id FROM workspaces WHERE workspace_name LIKE '%Singhi & Singhi%') GROUP BY is_deleted;");
  console.log('Singhi & Singhi Tasks:', res2.rows);
  await client.end();
}
run().catch(console.error);
