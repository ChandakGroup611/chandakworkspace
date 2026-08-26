require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSelects() {
  const { error: tktErr } = await supabase.from('tickets').select('id, title, code, status:status_master(status_name)').limit(1);
  console.log("TKT:", tktErr || "OK");

  const { error: tskErr } = await supabase.from('tasks').select('id, subject, task_code, status:status_master(status_name)').limit(1);
  console.log("TSK:", tskErr || "OK");

  const { error: reqErr } = await supabase.from('requirements').select('id, title, code, status:status_master(status_name)').limit(1);
  console.log("REQ:", reqErr || "OK");
}

testSelects();
