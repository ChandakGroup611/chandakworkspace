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
      if (match) {
        env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  });
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT tgname, proname, prosrc 
      FROM pg_trigger 
      JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid 
      JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid 
      WHERE relname = 'user_master';
    `
  });
  console.log('Triggers on user_master:', JSON.stringify(data, null, 2), error);
  
  const { data: d2, error: e2 } = await supabase.rpc('execute_sql', {
    sql: `SELECT proname, prosrc FROM pg_proc WHERE prosrc ILIKE '%permissions%' AND prosrc ILIKE '%user_permissions_snapshot%';`
  });
  console.log('Functions referencing permissions:', JSON.stringify(d2, null, 2), e2);
}

check();
