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
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runQueries() {
  console.log("Checking if Phase 3/4 migrations are applied...");
  // Check index existence
  const { data: idxData, error: idxErr } = await supabase.rpc('execute_sql', {
    sql: `SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_workspaces_deleted_created', 'idx_ups_user_perm');`
  });
  console.log("Indexes check:", idxData, idxErr);

  console.log("\nChecking RLS Function...");
  const { data: fnData, error: fnErr } = await supabase.rpc('execute_sql', {
    sql: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'is_super_admin';`
  });
  console.log("is_super_admin definition length:", fnData ? JSON.stringify(fnData).length : null, fnErr);
}

runQueries();
