const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGetVisibleWorkspaces() {
  const anandId = '59fd378e-4ebd-4994-9853-0e3b54a888fb';
  const t0 = Date.now();

  const { data: visibleWorkspaces, error } = await supabaseAdmin
    .from('workspaces')
    .select(`
      id,
      name:workspace_name,
      code:workspace_code,
      description,
      owner_id:workspace_owner_id,
      parent_workspace_id,
      company_id,
      status_id,
      start_date,
      end_date,
      is_active,
      created_at,
      company:company_master(name:company_name),
      status:status_master(name:status_name, status_color),
      hierarchy_task_count,
      hierarchy_subws_count,
      members:workspace_members(user_id, role),
      stats:workspace_statistics(task_count, subtask_count)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  console.log(`Query took ${Date.now() - t0}ms. Error:`, error?.message || null);
  console.log(`Workspaces fetched:`, visibleWorkspaces?.length);
}

testGetVisibleWorkspaces().catch(console.error);
