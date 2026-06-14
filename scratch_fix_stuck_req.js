require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { data: reqs } = await supabase.from('requirements').select('id, approval_status').eq('approval_status', 'Pending Approval');
  
  if (!reqs || reqs.length === 0) {
    console.log('No stuck requirements found.');
    return;
  }
  
  for (const req of reqs) {
    const { data: flows } = await supabase.from('requirement_approval_flow').select('id').eq('requirement_id', req.id);
    if (!flows || flows.length === 0) {
      console.log(`Fixing requirement ${req.id} back to Draft...`);
      await supabase.from('requirements').update({ approval_status: 'Draft' }).eq('id', req.id);
    }
  }
  console.log('Done.');
}
fix();
