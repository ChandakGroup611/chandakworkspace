const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runDiagnostics() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    console.log("--- 1. PG_STAT_STATEMENTS (Top 5 Slowest Queries) ---");
    try {
      const stats = await client.query(`
        SELECT query, round(total_exec_time::numeric, 2) as total_time_ms, calls, round(mean_exec_time::numeric, 2) as mean_time_ms 
        FROM pg_stat_statements 
        ORDER BY mean_exec_time DESC 
        LIMIT 5;
      `);
      console.log(JSON.stringify(stats.rows, null, 2));
    } catch (e) {
      console.log("pg_stat_statements not enabled or accessible: ", e.message);
    }

    console.log("\n--- 2. EXPLAIN ANALYZE: Workspaces (Level 1 Root Fetch) ---");
    const explainWs = await client.query(`
      EXPLAIN ANALYZE 
      SELECT id, workspace_name, parent_workspace_id, is_deleted 
      FROM workspaces 
      WHERE is_deleted = false AND parent_workspace_id IS NULL;
    `);
    console.log(explainWs.rows.map(r => r['QUERY PLAN']).join('\n'));

    console.log("\n--- 3. EXPLAIN ANALYZE: Tasks Paginated (Phase 3 strict query) ---");
    const explainTasks = await client.query(`
      EXPLAIN ANALYZE 
      SELECT id, subject, status_id, workspace_id 
      FROM tasks 
      WHERE workspace_id IN (SELECT id FROM workspaces LIMIT 1) 
      AND is_deleted = false 
      ORDER BY created_at DESC 
      LIMIT 50;
    `);
    console.log(explainTasks.rows.map(r => r['QUERY PLAN']).join('\n'));
    
    // Simulate RLS
    console.log("\n--- 4. EXPLAIN ANALYZE with RLS: Workspace Member Visibility ---");
    try {
      // Pick a user id
      const userRes = await client.query(`SELECT id FROM user_master LIMIT 1;`);
      if (userRes.rows.length > 0) {
        const userId = userRes.rows[0].id;
        await client.query(`set local role authenticated;`);
        await client.query(`set local request.jwt.claims = '{"sub": "${userId}"}';`);
        
        const explainRls = await client.query(`
          EXPLAIN ANALYZE 
          SELECT * FROM workspaces;
        `);
        console.log(`RLS Plan for User ${userId}:\n`);
        console.log(explainRls.rows.map(r => r['QUERY PLAN']).join('\n'));
      }
    } catch(e) {
      console.log("RLS check failed:", e.message);
    }

  } catch (err) {
    console.error("Database Connection Error:", err);
  } finally {
    await client.end();
  }
}

runDiagnostics();
