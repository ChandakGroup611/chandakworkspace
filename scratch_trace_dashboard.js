const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPerf() {
  const userId = "d0107e32-231a-46da-b088-75f1057e6bd3"; // Replace with actual user ID from db

  console.time("Dashboard Load");

  // Step 1: user_master
  console.time("1. Profile");
  await supabase.from("user_master").select("*").eq("id", userId).single();
  console.timeEnd("1. Profile");

  // Step 2: Departments
  console.time("2. Depts");
  await supabase.from("departments").select("id").eq("manager_id", userId);
  console.timeEnd("2. Depts");

  // Step 3: Visible Workspaces (simulated)
  console.time("3. Workspaces");
  const [memberRes, ownerRes] = await Promise.all([
    supabase.from('workspace_members').select('workspace_id').eq('user_id', userId).eq('is_deleted', false),
    supabase.from('workspaces').select('id').eq('workspace_owner_id', userId).eq('is_deleted', false)
  ]);
  const wsIds = new Set();
  memberRes.data?.forEach(w => wsIds.add(w.workspace_id));
  ownerRes.data?.forEach(w => wsIds.add(w.id));
  const authorizedIds = Array.from(wsIds);

  let workspaces = [];
  if (authorizedIds.length > 0) {
    const res = await supabase.from('workspaces').select(`id, name:workspace_name, code:workspace_code, description, owner_id:workspace_owner_id, parent_workspace_id, company_id, status_id, start_date, end_date, is_active, created_at, company:company_master(name:company_name), status:status_master(name:status_name, status_color), hierarchy_task_count, hierarchy_subws_count, members:workspace_members(user_id, role)`).in('id', authorizedIds).eq('is_deleted', false);
    workspaces = res.data || [];
  }
  console.timeEnd("3. Workspaces");

  // Step 4: All Users
  console.time("4. All Users");
  await supabase.from("user_master").select("id, full_name, user_code, profile_photo").eq("is_deleted", false).eq("is_active", true).order("full_name", { ascending: true });
  console.timeEnd("4. All Users");

  console.timeEnd("Dashboard Load");
}

supabase.from('user_master').select('id').limit(1).then(({ data }) => {
  if (data && data.length > 0) {
    testPerf();
  }
});
