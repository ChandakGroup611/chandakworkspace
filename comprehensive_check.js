const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("--- WORKSPACE & TASK OVERALL CHECK ---");

  // 1. Status Check
  const { data: statuses } = await supabase.from('status_master').select('*');
  console.log(`\nFound ${statuses.length} statuses in status_master.`);

  // 2. Users Check
  const { count: userCount } = await supabase.from('user_master').select('*', { count: 'exact', head: true });
  console.log(`\nTotal users in user_master: ${userCount}`);

  // 3. Workspaces Check
  const { data: workspaces, error: wsError } = await supabase.from('workspaces').select('id, status_id');
  if (wsError) console.error("Error fetching workspaces:", wsError);
  console.log(`\nTotal workspaces: ${workspaces?.length || 0}`);
  
  if (workspaces && workspaces.length > 0) {
    const wsStatuses = {};
    for (const ws of workspaces) {
      const statusName = statuses.find(s => s.id === ws.status_id)?.status_name || `UNKNOWN (${ws.status_id})`;
      wsStatuses[statusName] = (wsStatuses[statusName] || 0) + 1;
    }
    console.log("Workspaces by Status:");
    for (const [status, count] of Object.entries(wsStatuses)) {
      console.log(` - ${status}: ${count}`);
    }
  }

  // 4. Tasks Check
  const { data: tasks, error: tasksError } = await supabase.from('tasks').select('id, status_id');
  if (tasksError) console.error("Error fetching tasks:", tasksError);
  console.log(`\nTotal tasks: ${tasks?.length || 0}`);
  
  if (tasks && tasks.length > 0) {
    const taskStatuses = {};
    for (const task of tasks) {
      const statusName = statuses.find(s => s.id === task.status_id)?.status_name || `UNKNOWN (${task.status_id})`;
      taskStatuses[statusName] = (taskStatuses[statusName] || 0) + 1;
    }
    console.log("Tasks by Status:");
    for (const [status, count] of Object.entries(taskStatuses)) {
      console.log(` - ${status}: ${count}`);
    }
  }
  
  // 5. Data Migration Check
  // Check for potentially orphaned tasks
  const { data: orphanedTasks } = await supabase.from('tasks').select('id').is('workspace_id', null);
  if (orphanedTasks && orphanedTasks.length > 0) {
      console.log(`\nWARNING: Found ${orphanedTasks.length} tasks without a workspace_id!`);
  } else {
      console.log(`\nAll tasks have a workspace assigned.`);
  }

  // 6. Check data relationships (example tasks assigned to users)
  const { data: tasksWithoutAssignee } = await supabase.from('tasks').select('id').is('assigned_to', null);
  console.log(`Tasks without assignee: ${tasksWithoutAssignee?.length || 0}`);
}

check();
