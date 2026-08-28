const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSubTasks() {
  const { data: tasks, error } = await supabase.from('sub_tasks').select('id, subject, assigned_to, created_by').eq('is_deleted', false);
  if (error) {
    console.error(error);
    return;
  }
  
  const nullAssignees = tasks.filter(t => !t.assigned_to);
  console.log(`Total active sub_tasks: ${tasks.length}`);
  console.log(`Sub Tasks with NULL assigned_to: ${nullAssignees.length}`);
  if (nullAssignees.length > 0) {
    console.log('Sample NULL assignee sub_task:', nullAssignees[0].subject);
  }

  const { data: tickets } = await supabase.from('tickets').select('id, title, assignee_id, creator_id').eq('is_deleted', false);
  const nullTickets = tickets.filter(t => !t.assignee_id);
  console.log(`Total active tickets: ${tickets.length}`);
  console.log(`Tickets with NULL assignee_id: ${nullTickets.length}`);
}

checkSubTasks();
