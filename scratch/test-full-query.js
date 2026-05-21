const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const workspaceId = '79944a53-658d-4a73-bc25-38b9399928b0'; // WS-000038
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(`
      *,
      status:workflow_states(name, code),
      priority:master_priorities(name, code),
      parent_task:workspace_tasks!parent_task_id(id, code, title),
      checklists:task_checklists(*),
      attachments:task_attachments(*),
      assignee:user_master!assignee_id(id, full_name, profile_photo),
      assignees:task_assignees(user:user_master(id, full_name, profile_photo)),
      creator:user_master!creator_id(id, manager_id),
      teams:task_teams(team:teams(id, name, members:team_members(user:user_master(id, full_name, profile_photo))))
    `)
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false);
    
  console.log("Error:", error);
  console.log("Tasks found:", data?.length);
  if (data?.length > 0) {
    console.log("First task team:", data[0].teams);
  }
}

check();
