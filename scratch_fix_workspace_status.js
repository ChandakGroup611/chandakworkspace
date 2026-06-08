const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: statuses } = await supabase.from('status_master').select('*');
  const needToCheck = statuses.find(s => s.status_name === 'Need to check');
  const openStatus = statuses.find(s => s.status_name === 'OPEN' && s.scope_type === 'ERP');
  
  if (needToCheck && openStatus) {
    console.log(`Fixing workspaces from ${needToCheck.id} to ${openStatus.id}`);
    const { data, error } = await supabase.from('workspaces').update({ status_id: openStatus.id }).eq('status_id', needToCheck.id).select('id, workspace_name');
    console.log(`Fixed ${data?.length} workspaces!`, error || '');
  } else {
    console.log('Statuses not found');
  }
}
run();
