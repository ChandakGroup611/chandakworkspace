const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTasks() {
  const { data, error } = await supabase
    .from('requirement_tasks')
    .select('task_id, requirement_id, task:tasks(description), requirement:requirements(requirement_reason, requirement_details, functional_scope, custom_fields)');
  
  if (error) {
    console.error(error);
    return;
  }
  
  const tasksToUpdate = data.filter(d => d.task && (d.task.description === 'OK' || !d.task.description || d.task.description.trim() === ''));
  console.log('Tasks with empty or OK description:', tasksToUpdate.length);
  
  for (let i = 0; i < tasksToUpdate.length; i++) {
    const d = tasksToUpdate[i];
    const req = d.requirement;
    if (req) {
      const reason = req.requirement_reason || (req.custom_fields && req.custom_fields.business_reason) || '-';
      const details = req.requirement_details || req.functional_scope || '-';
      const newDesc = "Requirement Reason:\n" + reason + "\n\nRequirement Details:\n" + details;
      
      const res = await supabase.from('tasks').update({ description: newDesc }).eq('id', d.task_id);
      if (res.error) console.error('Error updating', d.task_id, res.error);
      else console.log('Updated', d.task_id);
    }
  }
}
checkTasks();
