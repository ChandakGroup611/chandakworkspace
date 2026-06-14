require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: reqs } = await supabase.from('requirements').select('id, title, approval_status, current_assignee_id');
  console.log("Requirements:");
  console.log(JSON.stringify(reqs, null, 2));

  const { data: flows } = await supabase.from('requirement_approval_flow').select('requirement_id, level, status, approver_id');
  console.log("Flows:");
  console.log(JSON.stringify(flows, null, 2));
}
check();
