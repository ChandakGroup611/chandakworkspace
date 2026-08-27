const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});

async function run() {
  const { Client } = require('pg');
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString.includes('pgbouncer=true')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE requirements
      ADD COLUMN IF NOT EXISTS signoff_approver_id UUID REFERENCES user_master(id);
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed", err);
  } finally {
    await client.end();
  }
}
run();
