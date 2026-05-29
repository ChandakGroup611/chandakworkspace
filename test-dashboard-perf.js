const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runProfile() {
  console.log("Starting profile...");
  const userId = '1a6f3b0e-db60-466d-88ab-d72b22bb8f4d'; // We need a real user ID. Let's just grab the first user.
  
  const { data: users } = await supabaseAdmin.from('user_master').select('id').limit(1);
  const uid = users[0]?.id;
  if (!uid) return console.log("No users found");

  console.time("hasPermission");
  const [roleRes, permRes] = await Promise.all([
    supabaseAdmin.from("user_master").select("role:roles(code)").eq("id", uid).single(),
    supabaseAdmin.from("user_permissions_snapshot").select("permission_code").eq("user_id", uid)
  ]);
  console.timeEnd("hasPermission");

  console.time("Parallel Fetch 5 Queries");
  const [profileRes, managedDeptsRes, memberRes, ownerRes, companies, priorities] = await Promise.all([
    supabaseAdmin.from("user_master").select("id").eq("id", uid).single(),
    supabaseAdmin.from("departments").select("id").eq("manager_id", uid),
    supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', uid).eq('is_deleted', false),
    supabaseAdmin.from('workspaces').select('id').eq('workspace_owner_id', uid).eq('is_deleted', false),
    supabaseAdmin.from("company_master").select("id").eq('is_active', true).eq('is_deleted', false),
    supabaseAdmin.from("priority_master").select("id").eq('is_active', true).eq('is_deleted', false)
  ]);
  console.timeEnd("Parallel Fetch 5 Queries");

  const workspaceIds = new Set();
  memberRes.data?.forEach(w => workspaceIds.add(w.workspace_id));
  ownerRes.data?.forEach(w => workspaceIds.add(w.id));
  const authorizedWorkspaceIds = Array.from(workspaceIds);

  console.time("Fetch Workspaces");
  if (authorizedWorkspaceIds.length > 0) {
    await supabaseAdmin
      .from('workspaces')
      .select(`id, members:workspace_members(user_id, role)`)
      .in('id', authorizedWorkspaceIds)
      .eq('is_deleted', false);
  }
  console.timeEnd("Fetch Workspaces");
}

runProfile();
