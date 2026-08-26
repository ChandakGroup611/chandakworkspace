const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('user_master')
    .select('id, full_name, email, role:roles(code)')
    .limit(10);
    
  if (error) console.error('Error fetching users:', error);
  else console.log('Users:', JSON.stringify(data, null, 2));
  
  const targetUser = data.find(u => u.full_name && u.full_name.includes('Avinash'));
  if (targetUser) {
     console.log('Target User ID:', targetUser.id);
     const { data: userRoles, error: rErr } = await supabase
      .from('user_roles')
      .select('role:roles(code, role_permissions(permissions(code)))')
      .eq('user_id', targetUser.id);
      
     if (rErr) console.error(rErr);
     else console.log('User Roles:', JSON.stringify(userRoles, null, 2));
  }
}

check().catch(console.error);
