require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  });
  
  await client.connect();
  
  const res = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' AND is_nullable = 'NO';
  `);
  
  console.log('NOT NULL COLUMNS:', res.rows.map(r => r.column_name));
  await client.end();
}

run().catch(console.error);
