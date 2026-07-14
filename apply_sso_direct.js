const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false } // Required for Supabase pooler usually
  });

  try {
    console.log("Connecting to pooler...");
    await client.connect();
    console.log("Connected!");

    const sql = fs.readFileSync('d:/adios/supabase/migrations/20260714000000_bulletproof_sso_triggers.sql', 'utf8');
    
    console.log("Executing SSO Trigger Migration...");
    await client.query(sql);
    
    console.log("SUCCESS: SSO Trigger has been applied to the remote database!");
  } catch (e) {
    console.error("ERROR applying migration:", e);
  } finally {
    await client.end();
  }
}

run();
