const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = "https://cffmgqdypmilwxkwhhve.supabase.co";
const supabaseKey = "sb_secret_no_iiH5AJiuPvVG2mmwfhw_DktimoMa"; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const sqlPath = process.argv[2];
    if (!sqlPath) {
      console.error("Please provide the sql path as an argument");
      process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`Applying migration: ${sqlPath}`);
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
