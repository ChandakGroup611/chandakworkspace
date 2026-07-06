require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const sqlPath = "d:\\adios\\supabase\\migrations\\20260624000000_software_amc_subscriptions.sql";
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Applying AMC migration via RPC...");
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
