require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'tasks' });
  if (error) {
    console.error('RPC failed:', error);
    // fallback, insert missing subject
    const res = await supabase.from('tasks').insert([{}]);
    console.log(res.error);
  } else {
    console.log(data);
  }
}
run();
