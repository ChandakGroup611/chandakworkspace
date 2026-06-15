const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT p.code FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = 'b6de054e-f665-4ef0-864c-2fe89c0305ca'");
  console.log('ROLE_ADMIN perms:', res.rows.map(r=>r.code));
  await client.end();
}
run().catch(console.error);
