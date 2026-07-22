require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabaseAdmin
    .from('status_master')
    .select('id, name:status_name, code:status_code, color:status_color, is_closed, is_reopen')
    .eq('scope_type', 'TASK')
    .order('status_order', { ascending: true });
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Success:", data && data.length);
  }
}
test();
