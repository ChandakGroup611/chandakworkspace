const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT permission_code FROM user_permissions_snapshot WHERE user_id = '06cb4e59-b0b3-45d7-b929-c526fc33c429'");
  console.log('Rohit perms:', res.rows.map(r=>r.permission_code));
  await client.end();
}
run().catch(console.error);
