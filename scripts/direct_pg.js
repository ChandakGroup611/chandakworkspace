const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function run() {
  console.log("Attempting direct Postgres connection...");
  let dbUrl = process.env.DATABASE_URL;
  
  // Attempt to rewrite to pooler URL if the direct db.* fails
  if (dbUrl.includes('db.cffmgqdypmilwxkwhhve.supabase.co')) {
    dbUrl = dbUrl.replace(
      'postgres:Avinash%40ADIOS@db.cffmgqdypmilwxkwhhve.supabase.co:5432',
      'postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-0-ap-south-1.pooler.supabase.com:5432'
    );
    console.log("Rewrote DB URL to pooler:", dbUrl);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected directly to Postgres!");

    const sql = fs.readFileSync('supabase/migrations/20260611000000_enterprise_identity_communication.sql', 'utf8');
    await client.query(sql);
    console.log("Applied SQL Migration directly via Postgres.");

    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("Schema Cache reloaded.");
    
    await client.end();
  } catch (e) {
    console.error("Direct connection failed:", e);
    
    // Fallback attempt: maybe it's just the IPv6 issue. Let's try setting PGHOST
    console.log("Trying original URL just in case...");
    try {
      const c2 = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
      await c2.connect();
      const sql = fs.readFileSync('supabase/migrations/20260611000000_enterprise_identity_communication.sql', 'utf8');
      await c2.query(sql);
      await c2.query("NOTIFY pgrst, 'reload schema';");
      console.log("Original URL succeeded.");
      await c2.end();
    } catch(e2) {
      console.error("Original URL also failed.", e2.message);
    }
  }
}

run();
