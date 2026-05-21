const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';

// Connect directly using Postgres instead of supabase-js to query pg_policies
const { Pool } = require('pg');

const dbUrl = env['DATABASE_URL'] || supabaseUrl.replace('https://', 'postgres://postgres:' + supabaseKey + '@db.') + ':5432/postgres';

const pool = new Pool({
  connectionString: 'postgresql://postgres.nmbzcygswfxlffnshylf:L@2o24L@2o24@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function extract() {
  try {
    const res = await pool.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    fs.writeFileSync('policies_extracted.json', JSON.stringify(res.rows, null, 2));
    console.log("Extracted " + res.rows.length + " policies to policies_extracted.json");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
extract();
