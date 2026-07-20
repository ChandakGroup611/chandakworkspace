const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
  const { data: policy } = await supabase.from('ticket_sla_policies').select('id').eq('code', 'SLA_STANDARD').single();
  const policyId = policy.id;

  const { data: tickets } = await supabase.from('tickets').select('id, created_at').eq('is_deleted', false);
  const { data: tasks } = await supabase.from('tasks').select('id, created_at').eq('is_deleted', false);
  const { data: reqs } = await supabase.from('requirements').select('id, created_at').eq('is_deleted', false);

  const toInsert = [];
  
  if (tickets) {
    for (const t of tickets) {
      toInsert.push({ ticket_id: t.id, sla_policy_id: policyId, created_at: t.created_at });
    }
  }
  if (tasks) {
    for (const t of tasks) {
      toInsert.push({ task_id: t.id, sla_policy_id: policyId, created_at: t.created_at });
    }
  }
  if (reqs) {
    for (const t of reqs) {
      toInsert.push({ requirement_id: t.id, sla_policy_id: policyId, created_at: t.created_at });
    }
  }

  if (toInsert.length > 0) {
    const { data, error } = await supabase.from('ticket_sla_trackers').insert(toInsert);
    console.log("Inserted:", toInsert.length);
    console.log("Error:", error);
  } else {
    console.log("Nothing to insert");
  }
}

backfill();
