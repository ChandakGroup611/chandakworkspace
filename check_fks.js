const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:Chandak_Workspace@db.tkovzymkubxtpcgynkgd.supabase.co:5432/postgres"
  });

  try {
    await client.connect();
    
    // Find all foreign keys referencing user_master
    const res = await client.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        rc.update_rule, 
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND rc.unique_constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name = 'user_master' AND constraint_type = 'PRIMARY KEY'
      )
    `);

    console.table(res.rows);
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
