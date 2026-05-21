const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) a[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  return a;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

async function apply() {
    const sql_query = fs.readFileSync('supabase/migrations/20260521090000_fix_infinite_recursion.sql', 'utf8');
    
    console.log("Executing SQL...");
    const { data, error } = await supabase.rpc('execute_sql', { sql_query });
    
    if (error) {
        console.error("Migration failed:", error);
    } else {
        console.log("Migration successful:", data);
    }
}

apply();
