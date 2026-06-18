const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: "SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename IN ('departments', 'status_master', 'priority_master', 'software_systems', 'requirements');"
  });
  console.log('Policies:', data, 'Error:', error);
}
check();
