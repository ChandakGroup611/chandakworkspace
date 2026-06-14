import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('requirements').select(`
    *,
    department:departments!requirements_department_id_fkey(name),
    status:status_master(name:status_name, status_color, code:status_code),
    priority:priority_master!requirements_priority_id_fkey(name:priority_name),
    software_system:software_systems(name),
    module:software_modules(name),
    sub_module:software_submodules(name),
    category:ticket_categories(name),
    sub_category:ticket_subcategories(name),
    creator:users!requirements_creator_id_fkey(full_name),
    requester:users!requirements_requester_id_fkey(full_name)
  `).limit(1).single();
  console.log('Error:', JSON.stringify(error));
  console.log('Data exists:', !!data);
}
test();
