const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: trackers, error: trackerError } = await supabase
      .from("ticket_sla_trackers")
      .select(`
        id, ticket_id,
        ticket:tickets (
          id, code, title, status_id, is_deleted
        )
      `)
      .limit(2);
      
  console.log("Error:", trackerError);
  console.log("Trackers:", JSON.stringify(trackers, null, 2));
}

check();
