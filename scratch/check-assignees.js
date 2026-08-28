const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTasks() {
  const { data: tasks, error } = await supabase.from('tasks').select('id, subject, assigned_to, created_by').eq('is_deleted', false);
  if (error) {
    console.error(error);
    return;
  }
  
  const nullAssignees = tasks.filter(t => !t.assigned_to);
  console.log(`Total active tasks: ${tasks.length}`);
  console.log(`Tasks with NULL assigned_to: ${nullAssignees.length}`);
  if (nullAssignees.length > 0) {
    console.log('Sample NULL assignee task:', nullAssignees[0].subject);
  }

  // Check if any assigned_to is missing from user_master
  const assigneeIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
  const { data: users } = await supabase.from('user_master').select('id').in('id', assigneeIds);
  const userIds = new Set(users.map(u => u.id));
  
  const invalidAssignees = tasks.filter(t => t.assigned_to && !userIds.has(t.assigned_to));
  console.log(`Tasks with assigned_to UUID not in user_master: ${invalidAssignees.length}`);
  if (invalidAssignees.length > 0) {
    console.log('Sample invalid assignee task:', invalidAssignees[0].subject);
  }
}

checkTasks();
