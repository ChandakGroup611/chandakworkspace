const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  try {
    const res1 = await client.query("SELECT pg_get_functiondef('public.handle_new_user_sync'::regproc)");
    console.log('handle_new_user_sync:\\n', res1.rows[0].pg_get_functiondef);
  } catch(e) { console.log('handle_new_user_sync error:', e.message); }

  try {
    const res2 = await client.query("SELECT pg_get_functiondef('public.handle_new_user'::regproc)");
    console.log('\\nhandle_new_user:\\n', res2.rows[0].pg_get_functiondef);
  } catch(e) { console.log('handle_new_user error:', e.message); }
  
  await client.end();
}
run().catch(console.error);
