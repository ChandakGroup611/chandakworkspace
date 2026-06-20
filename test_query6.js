const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('tasks').select(`
      id,
      assigned_to,
      owner_id,
      owner:users!tasks_owner_id_fkey(id, first_name),
      assignee:users!tasks_assigned_to_fkey(id, first_name)
  `).eq('is_deleted', false).limit(1);

  if (error) {
    console.log('Error Message:', error.message);
  } else {
    console.log('Success!', data);
  }
}
run();
