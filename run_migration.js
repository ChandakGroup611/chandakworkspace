const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const sql = fs.readFileSync('d:/adios/supabase/migrations/20260817000000_reconfigure_requirements_schema.sql', 'utf8');
    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await client.end();
  }
}
runMigration();
