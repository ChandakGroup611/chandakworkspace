const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres:Chandak_Workspace@db.tkovzymkubxtpcgynkgd.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    
    const sql = fs.readFileSync('d:/adios/supabase/migrations/20260624000004_amc_audit_logging.sql', 'utf8');
    await client.query(sql);
    console.log("Successfully applied audit logging migration to the direct remote database!");
    
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

main();
