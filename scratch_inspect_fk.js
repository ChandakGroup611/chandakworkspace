const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectForeignKeys() {
  const { data, error } = await supabaseAdmin.rpc('get_foreign_keys');
  // Or just query the postgres tables directly:
  const res = await supabaseAdmin.from('task_assignees').select('*').limit(1);
  console.log(res);
}

inspectForeignKeys();
