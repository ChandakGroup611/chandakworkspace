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

async function applyMigration() {
  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260531000000_enterprise_authorization_refactor.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log("Applying Migration...");
  
  const { data, error } = await supabase.rpc('execute_sql', { sql });
  
  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration successful!");
    console.log(data);
  }
}

applyMigration();
