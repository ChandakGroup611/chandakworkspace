const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  // Ensure the @ symbol in the password is URL encoded to %40 for the password, but the project ref needs no encoding
  const connectionString = "postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    console.log("Connecting to the remote database...");
    await client.connect();
    
    const sqlPath = "d:\\adios\\supabase\\migrations\\20260606000000_reset_sequences.sql";
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Applying migration to fix all reported issues...");
    await client.query(sql);
    
    console.log("Migration successfully applied!");
  } catch (err) {
    console.error("Error applying migration:", err);
  } finally {
    await client.end();
  }
}

applyMigration();
