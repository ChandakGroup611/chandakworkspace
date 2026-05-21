const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.nmbzcygswfxlffnshylf:L@2o24L@2o24@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'task_teams'
    `);
    console.log("task_teams columns:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
check();
