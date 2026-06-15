const { Client } = require('pg');
const fs = require('fs');

const sql = fs.readFileSync('supabase/migrations/20260614000000_add_missing_permissions.sql', 'utf8');

const db1 = 'postgresql://postgres.cffmgqdypmilwxkwhhve:Avinash%40ADIOS@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
const db2 = 'postgresql://postgres.tkovzymkubxtpcgynkgd:Chandak_Workspace@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function applyToDb(connString, name) {
  console.log(`\nAttempting to connect to ${name}...`);
  const client = new Client({ connectionString: connString });
  try {
    await client.connect();
    console.log(`✅ Connected to ${name}. Applying SQL...`);
    await client.query(sql);
    console.log(`✅ Successfully applied to ${name}!`);
  } catch (err) {
    console.error(`❌ Failed on ${name}:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await applyToDb(db1, 'Database 1 (cffmgqdypmilwxkwhhve)');
  await applyToDb(db2, 'Database 2 (tkovzymkubxtpcgynkgd)');
  console.log('\nDone!');
}

run();
