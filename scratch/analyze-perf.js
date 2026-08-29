require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
  try {
    await client.connect();
    console.log('Connected');
    const res = await client.query(`
      SELECT
        schemaname, tablename, indexname, indexdef
      FROM
        pg_indexes
      WHERE
        schemaname = 'public'
        AND tablename IN ('tasks', 'tickets', 'requirements', 'workspaces')
      ORDER BY
        tablename, indexname;
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    console.log("\n--- Checking Missing Indexes (Seq Scans) ---");
    const missing = await client.query(`
      SELECT
        relname AS table_name,
        seq_scan,
        seq_tup_read,
        idx_scan,
        seq_tup_read / seq_scan AS avg_rows_per_scan
      FROM
        pg_stat_user_tables
      WHERE
        seq_scan > 0
        AND relname IN ('tasks', 'tickets', 'requirements', 'workspaces')
      ORDER BY
        seq_tup_read DESC;
    `);
    console.log(JSON.stringify(missing.rows, null, 2));
    
  } catch(e) { console.error('Error:', e.message); }
  finally { await client.end(); }
}
run();
