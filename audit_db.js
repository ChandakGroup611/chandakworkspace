const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();

  console.log("=== TRIGGER AUDIT ===");
  const triggersRes = await client.query(`
    SELECT trigger_name, event_object_table AS table_name, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY table_name;
  `);
  console.log(triggersRes.rows);

  console.log("\n=== ORPHANED RECORDS CHECK ===");
  // Check tasks for invalid workspaces
  try {
    const orphanedTasks = await client.query("SELECT count(*) FROM tasks WHERE workspace_id IS NOT NULL AND workspace_id NOT IN (SELECT id FROM workspaces)");
    console.log("Orphaned Tasks (missing workspace):", orphanedTasks.rows[0].count);
  } catch(e) {}

  // Check user_master for invalid roles
  try {
    const orphanedRoles = await client.query("SELECT count(*) FROM user_master WHERE role_id IS NOT NULL AND role_id NOT IN (SELECT id FROM roles)");
    console.log("Users with missing roles:", orphanedRoles.rows[0].count);
  } catch(e) {}

  console.log("\n=== REALTIME PUBLICATION CHECK ===");
  try {
    const realtimeRes = await client.query("SELECT relation::regclass AS table_name FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
    console.log("Realtime enabled tables:", realtimeRes.rows.map(r=>r.table_name));
  } catch(e) {
    console.log("Error checking realtime:", e.message);
  }

  await client.end();
}
run().catch(console.error);
