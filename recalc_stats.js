const { Client } = require('pg');
const connString = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  console.log("Recalculating workspace statistics...");
  
  // 1. Reset all task counts to 0
  await client.query("UPDATE workspace_statistics SET task_count = 0, subtask_count = 0;");
  
  // 2. Count actual tasks from tasks table and update
  const query = `
    WITH task_counts AS (
        SELECT workspace_id, COUNT(*) as cnt
        FROM tasks
        WHERE is_deleted = false AND workspace_id IS NOT NULL
        GROUP BY workspace_id
    )
    UPDATE workspace_statistics s
    SET task_count = c.cnt
    FROM task_counts c
    WHERE s.workspace_id = c.workspace_id;
  `;
  await client.query(query);
  
  // 3. Verify
  const res = await client.query("SELECT w.workspace_name, s.task_count FROM workspace_statistics s JOIN workspaces w ON s.workspace_id = w.id WHERE w.workspace_name LIKE '%IA-%';");
  console.log('Updated Stats:', res.rows);
  
  await client.end();
}
run().catch(console.error);
