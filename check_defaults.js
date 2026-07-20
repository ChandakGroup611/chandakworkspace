require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: triggers } = await supabase.rpc('exec_sql', { sql: "SELECT event_object_table, trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'user_master';" });
  console.log("Triggers:", triggers);
  
  // also let's just do a manual query to see what role_id Operational Manager has
  const { data: om } = await supabase.from('roles').select('id').eq('code', 'ROLE_MANAGER').single();
  const { data: su } = await supabase.from('roles').select('id').eq('code', 'ROLE_AGENT').single();
  console.log("OM id:", om?.id, "SU id:", su?.id);
}
check();
