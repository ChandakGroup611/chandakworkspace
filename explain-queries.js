const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function analyze() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgres://postgres:password@').replace('.supabase.co', '.supabase.co:6543/postgres') }); // fallback, wait let's see if we have connection string
  // actually better to just use postgres directly, but let's check .env.local
}
