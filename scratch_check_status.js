const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: statuses } = await supabase.from('status_master').select('*');
  console.log('Statuses:', statuses.map(s => ({id: s.id, name: s.status_name, code: s.status_code, scope: s.scope_type})));
  
  const { data: workspaces } = await supabase.from('workspaces').select('id, workspace_name, status_id').limit(5);
  console.log('Workspaces:', workspaces.map(w => ({...w, status: statuses.find(s => s.id === w.status_id)?.status_name})));
  
  const { data: tasks } = await supabase.from('tasks').select('id, title, status_id').limit(5);
  console.log('Tasks:', tasks.map(t => ({...t, status: statuses.find(s => s.id === t.status_id)?.status_name})));
}
run();
