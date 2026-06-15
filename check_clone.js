const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT email, full_name, role_id FROM user_master WHERE role_id = '81cfced5-a02d-4924-9ee0-1ebdbebfe98b'");
  console.log('Users with cloned super admin:', res.rows);
  
  const res2 = await client.query("SELECT permission_id FROM role_permissions WHERE role_id = '81cfced5-a02d-4924-9ee0-1ebdbebfe98b'");
  console.log('Cloned role perms IDs:', res2.rows.map(r=>r.permission_id));
  await client.end();
}
run().catch(console.error);
