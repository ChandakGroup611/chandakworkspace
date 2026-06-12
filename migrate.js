const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  
  const fs = require('fs');
  const sql = fs.readFileSync('supabase/migrations/20260612000000_ticket_to_requirement_governance.sql', 'utf8');
  
  await client.query(sql);
  console.log('Migration executed successfully.');
  await client.end();
}

run().catch(console.error);
