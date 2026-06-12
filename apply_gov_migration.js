const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  const connectionString = "postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    console.log("Connecting to the remote database...");
    await client.connect();
    
    const sqlPath = "d:\\adios\\supabase\\migrations\\20260612000000_ticket_to_requirement_governance.sql";
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Applying Ticket-to-Requirement Governance migration...");
    await client.query(sql);
    
    console.log("Migration successfully applied!");
  } catch (err) {
    console.error("Error applying migration:", err);
  } finally {
    await client.end();
  }
}

applyMigration();
