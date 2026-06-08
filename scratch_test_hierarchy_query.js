const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFetch() {
  const { data, error } = await supabaseAdmin
        .from('workspaces')
        .select('id, name:workspace_name, code:workspace_code, description, owner_id:workspace_owner_id, parent_workspace_id, company_id, status_id, start_date, end_date, created_at, company:company_master(name:company_name), status:status_master(name:status_name, status_color), hierarchy_task_count, hierarchy_subws_count, members:workspace_members(user_id, role), parent:workspaces!parent_workspace_id(name:workspace_name, code:workspace_code)')
        .limit(1);

  console.log("SubWorkspace query error:", error ? error.message : "OK");
}

testFetch();
