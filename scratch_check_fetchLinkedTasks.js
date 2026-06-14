const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const reqId = '7bb3ae20-9eec-4216-b4b0-7d24af590fc6';
  const { data, error } = await supabaseAdmin
    .from('requirement_tasks')
    .select(`
      task_id,
      linked_at,
      task:tasks(
        id,
        subject,
        status:status_master(name:status_name, status_color),
        assigned_to,
        end_date
      )
    `)
    .eq('requirement_id', reqId)
    .order('linked_at', { ascending: false });

  console.log("Error:", error);
  console.log("Data:", data ? JSON.stringify(data, null, 2) : data);
}

run();
