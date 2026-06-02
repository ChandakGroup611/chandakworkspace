const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('sprints').select('*').limit(1);
  console.log("Sprints:", data || error);
  
  const { data: data2, error: error2 } = await supabase.from('task_templates').select('*').limit(1);
  console.log("Templates:", data2 || error2);
}

check();
