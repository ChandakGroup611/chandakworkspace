const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: statuses } = await supabase.from('status_master').select('*');
  const { data: tasks } = await supabase.from('tasks').select('id, title, status_id, created_at').order('created_at', { ascending: false }).limit(20);
  
  console.log('Recent Tasks:');
  tasks.forEach(t => {
    const s = statuses.find(x => x.id === t.status_id);
    console.log(`[${t.created_at}] ${t.title} -> ${s?.status_name}`);
  });
}
run();
