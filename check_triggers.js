const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
async function run() {
  await client.connect();
  const res = await client.query("SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'role_permissions'");
  console.log("role_permissions triggers:", res.rows);
  const res2 = await client.query("SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'user_roles'");
  console.log("user_roles triggers:", res2.rows);
  await client.end();
}
run().catch(console.error);
