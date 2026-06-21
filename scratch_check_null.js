const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: tasksF } = await supabase.from('tasks').select('id, is_deleted').eq('is_deleted', false);
  const { data: tasksN } = await supabase.from('tasks').select('id, is_deleted').is('is_deleted', null);
  const { data: tasksT } = await supabase.from('tasks').select('id, is_deleted').eq('is_deleted', true);
  
  console.log(`Tasks: false=${tasksF?.length}, null=${tasksN?.length}, true=${tasksT?.length}`);
  
  const { data: subTasksF } = await supabase.from('sub_tasks').select('id').eq('is_deleted', false);
  const { data: subTasksN } = await supabase.from('sub_tasks').select('id').is('is_deleted', null);
  
  console.log(`Sub Tasks: false=${subTasksF?.length}, null=${subTasksN?.length}`);
}
run();
