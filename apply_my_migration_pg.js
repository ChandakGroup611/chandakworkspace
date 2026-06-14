const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  const connectionString = "postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    const sqlPath = process.argv[2];
    if (!sqlPath) {
      console.error("Please provide the sql path as an argument");
      process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Connecting to the remote database...");
    await client.connect();
    
    console.log(`Applying migration: ${sqlPath}`);
    await client.query(sql);
    
    console.log("Migration successfully applied!");
  } catch (err) {
    console.error("Error applying migration:", err);
  } finally {
    await client.end();
  }
}

applyMigration();
