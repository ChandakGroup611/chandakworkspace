const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('notification_queue').select('target_user_id, count', { count: 'exact' });
  console.log("Error:", error);
  
  const res = await supabase.rpc('get_notification_counts_by_target');
  console.log("RPC res:", res);

  // let's just group by
  const { data: notifications } = await supabase.from('notification_queue').select('target_user_id');
  const counts = {};
  for(const n of (notifications || [])) {
    counts[n.target_user_id] = (counts[n.target_user_id] || 0) + 1;
  }
  console.log("Counts:", counts);
}

check();
