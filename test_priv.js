const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const userId = '78f24070-0437-4766-b2b9-8440a3d1c4e8'; // avinash@gmail.com

  const [profileRes, rolesRes, permsRes] = await Promise.all([
    supabaseAdmin.from("user_master").select("role_id, role:roles(code)").eq("id", userId).single(),
    supabaseAdmin.from("user_roles").select("role:roles!inner(code)").eq("user_id", userId),
    supabaseAdmin.from("user_permissions_snapshot").select("permission_code").eq("user_id", userId)
  ]);

  console.log("profileRes:", profileRes.data);
  console.log("rolesRes:", rolesRes.data);
  console.log("permsRes:", permsRes.data);
}

run();
