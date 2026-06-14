require('dotenv').config({path: '.env.local'});
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase URL or Service Role Key");
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
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
