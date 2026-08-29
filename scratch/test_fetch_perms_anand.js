const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = '59fd378e-4ebd-4994-9853-0e3b54a888fb'; // Anand Mohta
  
  try {
    const [profileRes, secondaryRolesRes] = await Promise.all([
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, profile_photo, is_deleted, created_at, role_id, role:roles(code, role_permissions(permissions(code)))")
        .eq("id", userId)
        .single(),
      supabaseAdmin
        .from("user_roles")
        .select("role:roles(code, role_permissions(permissions(code)))")
        .eq("user_id", userId)
    ]);

    console.log("Profile Fetch Error:", profileRes.error);
    console.log("Profile Fetch Data:", profileRes.data);
    console.log("Secondary Roles Fetch Error:", secondaryRolesRes.error);
    console.log("Secondary Roles Fetch Data:", secondaryRolesRes.data);

    let profileData = profileRes.data;
    if (profileData && !profileData.role && profileData.role_id) {
      console.log("Attempting fallback role fetch...");
      const { data: fallbackRole, error: fError } = await supabaseAdmin
        .from("roles")
        .select("code, role_permissions(permissions(code))")
        .eq("id", profileData.role_id)
        .single();
      console.log("Fallback Role Error:", fError);
      console.log("Fallback Role Data:", fallbackRole);
    }
  } catch (err) {
    console.error("Crash:", err);
  }
}

run();
