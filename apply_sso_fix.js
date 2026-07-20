require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  try {
    const sqlPath = "d:\\adios\\supabase\\migrations\\20260801000000_fix_default_role_trigger.sql";
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Applying migration via execute_sql RPC...");
    const { data, error } = await supabase.rpc('execute_sql', { sql });
    
    if (error) {
      console.error("Migration failed:", error);
    } else {
      console.log("Migration successfully applied via REST API!");
    }
  } catch (err) {
    console.error("Error applying migration:", err);
  }
}

applyMigration();
