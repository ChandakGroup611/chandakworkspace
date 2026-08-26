require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  try {
    console.log("Testing tasks...");
    const { data: tasks, error: tasksErr } = await supabase.from('tasks').select('id, subject, task_code').limit(1);
    if (tasksErr) throw tasksErr;
    
    console.log("Testing tickets...");
    const { data: tickets, error: ticketsErr } = await supabase.from('tickets').select('id, title, code').limit(1);
    if (ticketsErr) throw ticketsErr;

    console.log("Testing requirements...");
    const { data: reqs, error: reqsErr } = await supabase.from('requirements').select('id, title, requirement_code').limit(1);
    if (reqsErr) throw reqsErr;

    console.log("All DB queries succeeded.");
  } catch (err) {
    console.error("DB Query failed:", err);
  }
}
test();
