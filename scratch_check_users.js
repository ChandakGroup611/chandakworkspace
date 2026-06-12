const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("--- USERS CHECK ---");
  const { data: users } = await supabase.from('user_master').select('id');
  const userIds = new Set(users.map(u => u.id));
  
  const { data: tasks } = await supabase.from('tasks').select('id, assigned_to, created_by');
  
  let invalidAssignees = 0;
  let invalidCreators = 0;

  for (const task of tasks) {
    if (task.assigned_to && !userIds.has(task.assigned_to)) invalidAssignees++;
    if (task.created_by && !userIds.has(task.created_by)) invalidCreators++;
  }

  console.log(`Tasks with invalid assigned_to: ${invalidAssignees}`);
  console.log(`Tasks with invalid created_by: ${invalidCreators}`);

  // check workspace owner?
  const { data: workspaces } = await supabase.from('workspaces').select('id, owner_id');
  let invalidOwners = 0;
  for (const ws of workspaces) {
    if (ws.owner_id && !userIds.has(ws.owner_id)) invalidOwners++;
  }
  console.log(`Workspaces with invalid owner_id: ${invalidOwners}`);
}

check();
