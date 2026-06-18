const fs = require('fs');
const { Client } = require('pg');

let dbUrl = "postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const client = new Client({ 
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL via pooler");
    
    // Read the migration file
    const sql = fs.readFileSync('supabase/migrations/20260615000001_fix_requirements_select.sql', 'utf8');
    
    // Execute
    await client.query(sql);
    console.log("Migration executed successfully");
    
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
