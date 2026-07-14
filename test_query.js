const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const usersRes = await supabaseAdmin
      .from('user_master')
      .select(`
        id,
        user_code,
        full_name,
        email,
        profile_photo,
        is_active,
        manager_id,
        department_id,
        designation_id,
        role_id,
        department:departments(name),
        designation:designations!fk_user_master_designation(name),
        role:roles(name)
      `)
      .eq('is_deleted', false);

  if (usersRes.error) {
    console.error("QUERY ERROR:", usersRes.error);
  } else {
    console.log(`Found ${usersRes.data.length} users.`);
  }
}

run();
