const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT count(*) FROM role_permissions WHERE role_id = 'cd5be727-8785-482e-855e-b8494b51d93b'");
  console.log('SUPER_ADMIN perms count:', res.rows[0].count);
  
  const res2 = await client.query("SELECT count(*) FROM role_permissions WHERE role_id = '81cfced5-a02d-4924-9ee0-1ebdbebfe98b'");
  console.log('SUPER_ADMIN_CLONE perms count:', res2.rows[0].count);
  await client.end();
}
run().catch(console.error);
