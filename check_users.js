const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT email, full_name, role_id FROM user_master WHERE email LIKE '%avinash%' OR email LIKE '%super%'");
  console.log('Users in DB:');
  console.log(res.rows);

  const res2 = await client.query("SELECT * FROM roles WHERE code = 'SUPER_ADMIN'");
  console.log('SUPER_ADMIN role:');
  console.log(res2.rows);

  await client.end();
}
run().catch(console.error);
