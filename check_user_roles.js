const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  
  const res = await client.query("SELECT id, full_name, email, role_id FROM user_master WHERE email LIKE '%avinash%' OR email LIKE '%wajid%'");
  console.log('Users:');
  console.log(res.rows);
  
  const res2 = await client.query("SELECT * FROM user_roles");
  console.log('User Roles (secondary):');
  console.log(res2.rows);

  const res3 = await client.query("SELECT id, name, code FROM roles");
  console.log('Roles:');
  console.log(res3.rows);

  await client.end();
}
run().catch(console.error);
