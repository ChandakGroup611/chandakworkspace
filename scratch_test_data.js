const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: 'd:/adios/.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase
    .from('requirements')
    .select(`
      id,
      software_system_id,
      module_id,
      priority_id,
      requester_id,
      department_id,
      creator_id,
      status:status_master(name:status_name, status_color, code:status_code),
      priority:priority_master!requirements_priority_id_fkey(name:priority_name),
      software_system:software_systems(name),
      module:software_modules(name),
      sub_module:software_submodules(name),
      category:ticket_categories(name),
      sub_category:ticket_subcategories(name)
    `)
    .limit(1)
    .order('created_at', { ascending: false });
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}
run();
