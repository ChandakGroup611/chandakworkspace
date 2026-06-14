require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabaseAdmin
    .from('requirements')
    .select(`
      *,
      status:status_master(name:status_name, status_color, code:status_code),
      department:departments!requirements_department_id_fkey(name)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  console.log('Error:', error);
  console.log('Data length:', data?.length);
  if (data?.length > 0) console.log(data[0]);
}
run();
