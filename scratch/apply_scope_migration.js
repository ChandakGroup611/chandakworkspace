const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  const connectionString = "postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    console.log("Connecting to PostgreSQL database (aws-1)...");
    await client.connect();
    
    const sqlPath = "d:\\adios\\supabase\\migrations\\20260901000000_hierarchy_scoping_engine.sql";
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Applying hierarchy scoping migration...");
    await client.query(sql);
    
    console.log("Successfully applied hierarchy scoping engine functions!");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await client.end();
  }
}

applyMigration();
