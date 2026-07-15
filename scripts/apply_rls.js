const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260714000002_expand_vendor_master.sql'), 'utf8');
  
  const client = new Client({
    connectionString: "postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    console.log("Connected to database. Applying RLS security patch...");
    await client.query(sql);
    console.log("SUCCESS: RLS Security Patch applied successfully.");
  } catch (err) {
    console.error("Error applying patch:", err);
  } finally {
    await client.end();
  }
}

applyMigration();
