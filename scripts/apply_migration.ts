import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("Applying Migration...");
  const sql = fs.readFileSync('supabase/migrations/20260611000000_enterprise_identity_communication.sql', 'utf8');

  // Try to use execute_sql RPC
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error("Failed to apply migration via RPC:", error);
    // Since it's postgrest, maybe we just need to reload schema?
    const { error: reloadErr } = await supabase.rpc('reload_schema');
    if (reloadErr) console.error("Failed to reload schema via RPC:", reloadErr);
  } else {
    console.log("Migration Applied Successfully:", data);
    // Force schema reload
    await supabase.rpc('execute_sql', { sql_query: 'NOTIFY pgrst, \'reload schema\';' });
    console.log("Schema Cache Reloaded.");
  }
}

run();
