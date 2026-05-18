const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkWorkflowStates() {
  const { data, error } = await supabase.from('workflow_states').select('*').in('id', [
    '11111111-aaaa-bbbb-cccc-111111111111',
    '22222222-aaaa-bbbb-cccc-222222222222'
  ]);
  if (error) {
    console.error(error);
    return;
  }
  console.log('Conflicting Workflow States:', data);
}

checkWorkflowStates();
