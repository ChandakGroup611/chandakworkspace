const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT relation::regclass AS table_name FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
  console.log('Realtime tables:', res.rows.map(r => r.table_name));
  await client.end();
}
run().catch(console.error);
