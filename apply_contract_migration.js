const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = fs.readFileSync('supabase/migrations/20260724000001_dynamic_contract_types.sql', 'utf8');
  const { data, error } = await supabase.rpc('query_db', { query_text: query });
  if (error) {
    console.error("Migration Error:", error);
  } else {
    console.log("Migration Data:", data);
    console.log("Migration applied successfully.");
  }
}
run();
