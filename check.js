require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const recordId = 'c4444f28-c3f9-481d-b9fb-8d508f4fe05e';
  const { data: r, error } = await supabase
    .from('requirements')
    .select('id, code')
    .or(`id.eq.${recordId},code.eq.${recordId}`)
    .limit(1)
    .maybeSingle();
    
  console.log('r:', r, 'error:', error);
}
check();
