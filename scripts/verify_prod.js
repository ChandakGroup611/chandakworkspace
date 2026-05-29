const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Avinash%40ADIOS@db.cffmgqdypmilwxkwhhve.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function verifyProduction() {
  const client = await pool.connect();
  try {
    console.log("=== PHASE 2: VERIFY ALL MIGRATIONS EXECUTED ===");
    const { rows: migrations } = await client.query(`
      SELECT version, statements[1] as name 
      FROM supabase_migrations.schema_migrations 
      ORDER BY version DESC LIMIT 10
    `);
    console.log("Latest applied migrations in production:");
    migrations.forEach(m => console.log(`- ${m.version} (${m.name?.substring(0, 50)})`));

    console.log("\n=== PHASE 3: VERIFY INDEX EXISTENCE ===");
    const { rows: indexes } = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname IN (
        'idx_workspaces_deleted_created',
        'idx_ups_user_perm',
        'idx_ticket_perf_created',
        'idx_task_hierarchy'
      )
    `);
    console.log(`Found ${indexes.length} enterprise composite indexes in production.`);
    indexes.forEach(idx => console.log(`- ${idx.indexname}`));

    console.log("\n=== PHASE 4: VERIFY RLS HARDENING DEPLOYED ===");
    const { rows: policies } = await client.query(`
      SELECT schemaname, tablename, policyname, qual 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND qual LIKE '%has_permission%'
    `);
    
    if (policies.length > 0) {
      console.log(`⚠️ WARNING: Found ${policies.length} legacy RLS policies still using has_permission()!`);
      policies.forEach(p => console.log(`- ${p.tablename}: ${p.policyname}`));
    } else {
      console.log("✅ SUCCESS: No legacy recursive has_permission() RLS policies found.");
    }
    
    console.log("\n=== PRE-PRODUCTION GOVERNANCE VERIFICATION COMPLETE ===");
  } catch (err) {
    console.error("Verification failed:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

verifyProduction();
