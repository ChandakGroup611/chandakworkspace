const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const config = {};
lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) config[key.trim()] = value.trim();
});

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || config.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaskDetails() {
  console.log("Running getTaskDetails query against Supabase...");
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(`
      *,
      workspace:workspaces(id, code, name),
      status:workflow_states(name, code),
      creator:user_master!creator_id(full_name, profile_photo),
      assignees:task_assignees(user:user_master(id, full_name, profile_photo)),
      teams:task_teams(team:teams(id, name)),
      checklists:task_checklists(*),
      attachments:task_attachments(*)
    `)
    .limit(1);
  
  if (error) {
    console.error('Detailed Error object:', JSON.stringify(error, null, 2));
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Details:', error.details);
    console.error('Error Hint:', error.hint);
  } else {
    console.log('Query succeeded, found tasks:', data?.length);
  }
}

checkTaskDetails();
