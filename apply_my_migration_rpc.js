const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = "https://cffmgqdypmilwxkwhhve.supabase.co";
const supabaseKey = "sb_secret_no_iiH5AJiuPvVG2mmwfhw_DktimoMa"; // from .env.local
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const sqlPath = "d:\\adios\\supabase\\migrations\\20260605000000_fix_all_reported_issues.sql";
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Applying migration to fix all reported issues...");
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
