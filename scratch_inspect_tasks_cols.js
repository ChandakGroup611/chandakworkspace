const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTasks() {
  const { data, error } = await supabaseAdmin.from('tasks').select('*').limit(1);
  console.log(Object.keys(data[0]));
}

inspectTasks();
