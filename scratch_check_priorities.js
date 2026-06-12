const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("--- PRIORITY CHECK ---");
  const { data: priorities } = await supabase.from('priority_master').select('*');
  console.log(`\nFound ${priorities?.length || 0} priorities.`);

  const { data: tasksWithPriority } = await supabase.from('tasks').select('id, priority_id');
  if (tasksWithPriority && tasksWithPriority.length > 0) {
    const pStatuses = {};
    for (const task of tasksWithPriority) {
      const pName = task.priority_id ? priorities.find(p => p.id === task.priority_id)?.priority_name || `UNKNOWN (${task.priority_id})` : 'NO_PRIORITY';
      pStatuses[pName] = (pStatuses[pName] || 0) + 1;
    }
    console.log("Tasks by Priority:");
    for (const [pName, count] of Object.entries(pStatuses)) {
      console.log(` - ${pName}: ${count}`);
    }
  }
}
check();
