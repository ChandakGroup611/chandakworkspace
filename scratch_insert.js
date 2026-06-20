require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('permissions')
    .upsert([
      { code: 'DATA_MIGRATION_VIEW', name: 'Data Migration Access', module: 'MASTERS', action: 'view' },
      { code: 'TASKS_TRANSFER', name: 'Transfer Tasks', module: 'WORKSPACES', action: 'execute' }
    ], { onConflict: 'code' });

  if (error) console.error(error);
  else console.log('Successfully inserted permissions!', data);
}

run();
