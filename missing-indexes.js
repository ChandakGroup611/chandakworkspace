const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

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

  try {
    const res = await client.query(query);
    console.table(res.rows);
  } catch(e) {
    console.log(e.message);
  }
  
  await client.end();
}
run();
