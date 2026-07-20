const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tasks, error: e1 } = await supabase.from('ticket_sla_trackers').select('id, task_id').not('task_id', 'is', null);
  const { data: reqs, error: e2 } = await supabase.from('ticket_sla_trackers').select('id, requirement_id').not('requirement_id', 'is', null);
  
  console.log("Tasks SLAs:", tasks ? tasks.length : 0, e1);
  console.log("Req SLAs:", reqs ? reqs.length : 0, e2);
}

check();
