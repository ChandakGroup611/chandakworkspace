const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:Chandak_Workspace@db.tkovzymkubxtpcgynkgd.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log("Connected directly!");
    const res = await client.query(`
      SELECT
        relname AS TableName,
        seq_scan,
        idx_scan,
        seq_scan - idx_scan AS missing_index
      FROM pg_stat_user_tables
      WHERE seq_scan > 0
      ORDER BY missing_index DESC
      LIMIT 20;
    `);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
