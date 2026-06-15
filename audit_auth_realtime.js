const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();

  console.log("=== AUTH TRIGGERS ===");
  const authTriggers = await client.query(`
    SELECT trigger_name, event_object_table AS table_name, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'auth'
  `);
  console.log(authTriggers.rows);

  console.log("\n=== REALTIME PUBLICATION CHECK ===");
  try {
    const realtimeRes = await client.query("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
    console.log("Realtime enabled tables:", realtimeRes.rows.map(r=>r.tablename));
  } catch(e) {
    console.log("Error checking realtime:", e.message);
  }

  await client.end();
}
run().catch(console.error);
