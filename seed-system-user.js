const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedSystemUser() {
  console.log("Seeding system user...");
  
  // Need to get a valid role_id for the system user. 
  // We'll use the canonical SUPER_ADMIN role ID since we know it exists.
  const { data: roles } = await supabase.from('roles').select('id, code');
  const superAdminRole = roles.find(r => r.code === 'SUPER_ADMIN');
  
  if (!superAdminRole) {
    console.error("Could not find SUPER_ADMIN role.");
    return;
  }
  
  const systemUserId = '00000000-0000-0000-0000-000000000000';
  
  // 1. Check if user already exists
  const { data: existingUser } = await supabase.from('user_master').select('id').eq('id', systemUserId).maybeSingle();
  
  if (existingUser) {
    console.log("System user already exists.");
  } else {
    // 2. Insert the user
    const { error } = await supabase.from('user_master').insert([{
      id: systemUserId,
      full_name: 'System Actor',
      user_code: 'SYS-0000',
      email: 'system@adios.com',
      role_id: superAdminRole.id,
      password_hash: 'SYSTEM_NO_LOGIN',
      is_active: true,
      is_deleted: false
    }]);
    
    if (error) {
      console.error("Error inserting system user:", error);
    } else {
      console.log("System user seeded successfully!");
    }
  }
}

seedSystemUser();
