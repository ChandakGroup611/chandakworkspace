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
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] || '';
const jwt = require('jsonwebtoken');

// Generate JWT for SUPER ADMIN manually
const token = jwt.sign(
  {
    role: 'authenticated',
    aud: 'authenticated',
    sub: 'd0ed39c4-4d4d-49f9-a86a-efa666c6c9d1',
    app_metadata: { role: 'ROLE_ADMIN' }
  },
  'YOUR_SUPABASE_JWT_SECRET',
  { expiresIn: '1h' }
);
// Without JWT secret we can't test RLS accurately using the SDK unless we login with password.

// Let's use the service role, but SET the role and uid using Postgres directly.
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.nmbzcygswfxlffnshylf:L@2o24L@2o24@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  const client = await pool.connect();
  try {
    await client.query(`SET request.jwt.claim.sub = '53b7dbae-6049-44a7-a9c1-4ba769b4c324'`);
    await client.query(`SET request.jwt.claim.app_metadata = '{"role":"ROLE_ADMIN"}'`);
    await client.query(`SET role authenticated`);
    
    // Now run a simple select
    const res = await client.query(`SELECT id FROM public.workspace_tasks WHERE workspace_id = '79944a53-658d-4a73-bc25-38b9399928b0'`);
    console.log("Tasks found via RLS:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
// wait, the pool connection failed earlier. I can't do this.
