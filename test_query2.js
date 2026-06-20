const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('tasks').select(`
      id,
      assigned_to,
      owner_id,
      owner:user_master!owner_id(id, full_name, email),
      assignee:user_master!tasks_assigned_to_fkey(id, full_name)
  `).eq('is_deleted', false).limit(1);

  if (error) {
    console.log('Detailed Error:', JSON.stringify(error, null, 2));
    console.log('Error Message:', error.message);
  } else {
    console.log('Success!', data);
  }
}
run();
