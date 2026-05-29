require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function analyzeProduction() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL found.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("=== PHASE 3: CHECKING COMPOSITE INDEXES ===");
    const indexesQuery = `
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('workspaces', 'tasks', 'tickets', 'requirements', 'user_master', 'workspace_members', 'user_permissions_snapshot')
      AND indexname LIKE 'idx_%';
    `;
    const idxRes = await pool.query(indexesQuery);
    console.log("Indexes Found:", idxRes.rows.map(r => r.indexname));

    console.log("\n=== PHASE 4: RLS PERFORMANCE INVESTIGATION (pg_stat_statements) ===");
    try {
      const statsQuery = `
        SELECT substring(query, 1, 150) as trunc_query, 
               calls, 
               total_exec_time, 
               mean_exec_time,
               rows
        FROM pg_stat_statements 
        ORDER BY total_exec_time DESC 
        LIMIT 10;
      `;
      const statsRes = await pool.query(statsQuery);
      console.table(statsRes.rows);
    } catch (e) {
      console.log("Could not access pg_stat_statements (might require extension or superuser):", e.message);
    }

    console.log("\n=== EXPLAIN ANALYZE TASK DETAIL QUERY ===");
    const explainQuery = `
      EXPLAIN ANALYZE
      SELECT * FROM tasks LIMIT 10;
    `;
    const explainRes = await pool.query(explainQuery);
    explainRes.rows.forEach(r => console.log(r['QUERY PLAN']));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}

analyzeProduction();
