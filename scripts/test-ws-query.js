const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAll() {
  console.log('Testing all parallel queries of fetchWorkspaceDashboardData...');
  const t0 = Date.now();

  const anandId = '59fd378e-4ebd-4994-9853-0e3b54a888fb';

  const [profileRes, managedDeptsRes, companiesRes, prioritiesRes, statusesRes, allUsersRes] = await Promise.all([
    supabaseAdmin.from("user_master").select("id, full_name, email, role_id, department_id, designation_id, manager_id, is_active, created_at, updated_at").eq("id", anandId).single(),
    supabaseAdmin.from("departments").select("id").eq("manager_id", anandId),
    supabaseAdmin.from("company_master").select("id, name:company_name, code:company_code").eq('is_active', true).eq('is_deleted', false).order("company_name", { ascending: true }),
    supabaseAdmin.from("priority_master").select("id, name:priority_name, code:priority_code, scope_id").eq('is_active', true).eq('is_deleted', false),
    supabaseAdmin.from("status_master").select("id, name:status_name, code:status_code, status_color, scope_type, is_closed, is_terminal, status_order").eq("is_deleted", false).eq("scope_type", "TASK").order("status_order", { ascending: true }),
    supabaseAdmin.from("user_master").select("id, full_name, user_code, email").eq("is_active", true).eq("is_deleted", false).order("full_name", { ascending: true })
  ]);

  console.log(`Parallel queries finished in ${Date.now() - t0}ms.`);
  console.log('profile:', profileRes.data?.full_name);
  console.log('companies:', companiesRes.data?.length);
  console.log('priorities:', prioritiesRes.data?.length);
  console.log('statuses:', statusesRes.data?.length);
  console.log('allUsers:', allUsersRes.data?.length);
}

testAll().catch(console.error);
