const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  const sql = fs.readFileSync('supabase/migrations/20260603000000_sprints_and_templates.sql', 'utf8');
  
  // We need to use postgres connection or a generic SQL execution RPC if available
  // Let's check if execute_sql is available
  const { data, error } = await supabase.rpc('execute_sql', { sql });
  
  if (error) {
     console.error("RPC failed, we will use postgres connection instead.");
     // If the rpc fails, we need to connect via postgres directly.
     // Is there a connection string?
     console.log("Error details:", error);
  } else {
     console.log("Migration applied via RPC.");
  }
}
applyMigration();
