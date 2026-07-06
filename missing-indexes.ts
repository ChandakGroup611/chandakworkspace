import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const query = `
    SELECT
      relname AS TableName,
      seq_scan,
      idx_scan,
      seq_scan - idx_scan AS missing_index
    FROM pg_stat_user_tables
    WHERE seq_scan > 0
    ORDER BY missing_index DESC
    LIMIT 20;
  `;
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
  
  if (error) {
    console.error("Error executing query:", error);
    return;
  }
  console.log("Missing indexes (Top 20 by seq_scan diff):");
  console.table(data);

  // Also query for slow queries if pg_stat_statements is available
  const pgStatQuery = `
    SELECT query, calls, total_exec_time, mean_exec_time, rows 
    FROM pg_stat_statements 
    ORDER BY total_exec_time DESC 
    LIMIT 5;
  `;
  const { data: pgStatData } = await supabase.rpc('execute_sql', { sql_query: pgStatQuery });
  if (pgStatData) {
      console.log("\nTop 5 Slowest Queries:");
      console.log(JSON.stringify(pgStatData, null, 2));
  }
}

run();
