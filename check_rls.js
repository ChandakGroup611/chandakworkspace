const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: "SELECT * FROM pg_policies WHERE tablename = 'ticket_sla_trackers';"
  });
  console.log("Policies:", data, error);
}

check();
