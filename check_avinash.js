const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
async function run() {
  await client.connect();
  const res = await client.query("SELECT permission_code FROM user_permissions_snapshot WHERE user_id = '86f73148-0a8d-49cf-a96b-6d748800737e'");
  console.log('Avinash perms:', res.rows.map(r=>r.permission_code));
  await client.end();
}
run().catch(console.error);
