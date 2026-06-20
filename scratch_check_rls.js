const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use postgres to fetch RLS policies
const { Client } = require('pg');

async function checkRLS() {
  const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:54322/postgres";
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    const res = await client.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'departments';
    `);
    console.log("Departments RLS Policies:", res.rows);
  } catch(e) {
    console.error("Error", e);
  } finally {
    await client.end();
  }
}

checkRLS();
