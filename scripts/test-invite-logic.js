const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInviteLogic() {
  const anandId = '59fd378e-4ebd-4994-9853-0e3b54a888fb';

  // Check 1: Is caller admin?
  const roleRes = await supabaseAdmin
    .from("user_master")
    .select("role:roles(code), role_id")
    .eq("id", anandId)
    .single();
  console.log("Caller role:", roleRes.data);

  // Check 2: Try creating a dummy test user or checking admin client functions
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Service key starts with:", process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10));

  // Check 3: Check user_master_audit_logs table existence
  const auditRes = await supabaseAdmin.from("user_master_audit_logs").select("id").limit(1);
  console.log("user_master_audit_logs query error:", auditRes.error?.message || "Table OK");

  // Check 4: Check refresh_single_user_permissions_snapshot
  const snapRes = await supabaseAdmin.rpc("refresh_single_user_permissions_snapshot", { p_user_id: anandId });
  console.log("refresh_single_user_permissions_snapshot error:", snapRes.error?.message || "RPC OK");
}

testInviteLogic().catch(console.error);
