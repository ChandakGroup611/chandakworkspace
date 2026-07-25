const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = fs.readFileSync('supabase/migrations/20260724000002_industry_vendor_masters.sql', 'utf8');
  
  console.log("Applying migration using execute_sql RPC...");
  const { data, error } = await supabase.rpc('execute_sql', { sql: query });
  
  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration executed successfully!");
    console.log(data);
  }
}

run();
