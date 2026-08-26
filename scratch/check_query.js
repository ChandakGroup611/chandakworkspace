const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('user_master')
    .select('id, full_name, email, profile_photo, is_deleted, created_at, role:roles(code, role_permissions(permissions(code)))')
    .eq('email', 'avinash.pise@chandakgroup.com')
    .single();
    
  if (error) console.error('Error:', error);
  else console.log('User Data:', JSON.stringify(data, null, 2));
}

check().catch(console.error);
