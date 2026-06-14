const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: 'd:/adios/.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase
    .from('requirements')
    .select(`
      id,
      creator:user_master!creator_id(full_name),
      requester:user_master!requester_id(full_name),
      department:departments!department_id(name),
      requester_department:departments!requester_department_id(name)
    `)
    .limit(1)
    .order('created_at', { ascending: false });
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}
run();
