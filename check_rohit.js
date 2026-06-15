const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT email, full_name, role_id FROM user_master WHERE email = 'rohit@gmail.com' OR email = 'avinash2@gmail.com'");
  console.log('Rohit user:', res.rows);
  await client.end();
}
run().catch(console.error);
