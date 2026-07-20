const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const sql = fs.readFileSync('d:\\adios\\supabase\\migrations\\20260715000000_universal_sla_trackers.sql', 'utf8');
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  console.log("Migration:", data, error);
  
  const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { sql_query: "NOTIFY pgrst, 'reload schema';" });
  console.log("Reload:", data2, error2);
}
test();
