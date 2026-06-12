const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function grantPermissions() {
  try {
    await pool.query('GRANT ALL ON TABLE public.tasks TO service_role;');
    await pool.query('GRANT ALL ON TABLE public.tasks TO anon;');
    await pool.query('GRANT ALL ON TABLE public.tasks TO authenticated;');
    console.log("Grants executed successfully.");
  } catch (err) {
    console.error("Error executing grants:", err);
  } finally {
    pool.end();
  }
}

grantPermissions();
