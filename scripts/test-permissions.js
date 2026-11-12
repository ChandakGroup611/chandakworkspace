const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUserContext() {
  const anandId = '59fd378e-4ebd-4994-9853-0e3b54a888fb';

  const [roleRes, permRes] = await Promise.all([
    supabaseAdmin
      .from("user_master")
      .select("role:roles(code), role_id, email")
      .eq("id", anandId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_permissions_snapshot")
      .select("permission_code")
      .eq("user_id", anandId)
  ]);

  console.log('roleRes:', JSON.stringify(roleRes, null, 2));
  console.log('permRes count:', permRes.data?.length);

  let dbRoleCode = Array.isArray(roleRes.data?.role) 
    ? roleRes.data?.role[0]?.code 
    : roleRes.data?.role?.code;

  console.log('dbRoleCode before fallback:', dbRoleCode);

  if (!dbRoleCode && roleRes.data?.role_id) {
    const { data: fallbackRole } = await supabaseAdmin
      .from("roles")
      .select("code")
      .eq("id", roleRes.data.role_id)
      .maybeSingle();
    console.log('fallbackRole:', fallbackRole);
    if (fallbackRole?.code) {
      dbRoleCode = fallbackRole.code;
    }
  }

  console.log('Resolved dbRoleCode:', dbRoleCode);
}

testUserContext().catch(console.error);

