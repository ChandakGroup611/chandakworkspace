require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: task, error } = await supabaseAdmin.from('tasks').select(`
      *,
      status:status_master(id, name:status_name, code:status_code, is_closed),
      priority:priority_master(id, name:priority_name, color:priority_color),
      department:departments(id, name),
      workspace:workspaces(id, name:workspace_name, members:workspace_members(user_id, role))
    `).limit(1);

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Workspace shape:", Array.isArray(task[0].workspace) ? "Array" : "Object", task[0].workspace);
  }
}
test();
