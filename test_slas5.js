const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
      .from("workspace_tasks")
      .select(`
        id, subject, status_id,
        status:status_master ( status_name )
      `)
      .limit(2);
      
  console.log("Error:", error);
  console.log("Tasks:", JSON.stringify(data, null, 2));
}

check();
