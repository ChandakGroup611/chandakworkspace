const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: trackers, error: trackerError } = await supabase
      .from("ticket_sla_trackers")
      .select(`
        id,
        created_at,
        is_paused,
        total_paused_minutes,
        policy:ticket_sla_policies (
          id, name, code, response_target_minutes, resolution_target_minutes, escalation_level
        ),
        ticket:tickets (
          id, code, title, status:status_master(status_name, is_closed)
        ),
        task:tasks (
          id, subject, status:status_master(status_name, is_closed)
        ),
        requirement:requirements (
          id, code, title, status:status_master(status_name, is_closed)
        )
      `)
      .limit(10);
      
  console.log("Error:", trackerError);
  console.log("Trackers:", trackers ? trackers.length : 0);
  if (trackers && trackers.length > 0) {
      console.log("Sample 0:", JSON.stringify(trackers[0], null, 2));
  }
}

check();
