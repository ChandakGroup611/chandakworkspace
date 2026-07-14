const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgres://postgres.').replace('.supabase.co', ':6543/postgres') 
  // Wait, direct postgres connection string requires the db password, which I don't have.
  // I must use Supabase JS client to query.
