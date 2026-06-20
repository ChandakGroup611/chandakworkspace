const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('tasks').select('id, department:departments(name)').limit(10);
  console.log("Tasks department mapping:", JSON.stringify(data, null, 2));
}

check();
