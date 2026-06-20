const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('tasks').select(`
      id,
      subject,
      workspace_id,
      parent_task_id,
      assigned_to,
      owner_id
  `).eq('is_deleted', false).limit(1);

  if (error) {
    console.log('Error Message:', error.message);
  } else {
    console.log('Success!', data);
  }
}
run();
