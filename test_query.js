const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('tasks').select(`
      id,
      subject,
      task_code,
      description,
      workspace_id,
      parent_task_id,
      status:status_master(status_name, status_code),
      priority:priority_master(priority_name, priority_code),
      created_at,
      assigned_to,
      owner:user_master!tasks_owner_id_fkey(id, full_name, email),
      workspace:workspaces!tasks_workspace_id_fkey(workspace_name, workspace_code)
  `).eq('is_deleted', false).limit(1);

  if (error) {
    console.log('Detailed Error:', JSON.stringify(error, null, 2));
    console.log('Error Message:', error.message);
    console.log('Error Details:', error.details);
    console.log('Error Hint:', error.hint);
  } else {
    console.log('Success!');
    console.log(Object.keys(data[0] || {}));
  }
}
run();
