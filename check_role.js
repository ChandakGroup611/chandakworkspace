const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT id, full_name, email, role_id FROM user_master WHERE email LIKE '%avinash%' OR email = 'chrome_superadmin@adios.com'");
  console.log('Users in user_master:', res.rows);

  const res2 = await client.query("SELECT * FROM roles WHERE id IN (SELECT role_id FROM user_master WHERE email LIKE '%avinash%' OR email = 'chrome_superadmin@adios.com')");
  console.log('Roles for those users:', res2.rows);

  // Check their snapshot again!
  const res3 = await client.query("SELECT permission_code FROM user_permissions_snapshot WHERE user_id = '86f73148-0a8d-49cf-a96b-6d748800737e'");
  console.log('Avinash permissions_snapshot has SUPER_ADMIN?', res3.rows.some(r => r.permission_code === 'SUPER_ADMIN'));

  await client.end();
}
run().catch(console.error);
