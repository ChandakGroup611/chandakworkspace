require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: trigger } = await supabase.rpc('run_query', { query_text: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';" });
  console.log("Trigger:", trigger);
  
  const { data: trigger_sync } = await supabase.rpc('run_query', { query_text: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user_sync';" });
  console.log("Trigger Sync:", trigger_sync);
}
check();
