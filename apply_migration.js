require('dotenv').config({path: '.env.local'});
const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL found in .env.local");
    process.exit(1);
  }
  
  // Use direct connection if using transaction pooler
  let url = connectionString;
  if (url.includes('pooler.supabase.com')) {
    // If it's a pooler URL, we usually need ssl
  }
  
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  
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
