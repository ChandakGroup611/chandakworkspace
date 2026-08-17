const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabaseAdmin
      .from('requirements')
      .select('id, code, title, scope, approval_status, created_at, creator_id, requester_id, objective, functional_scope, technical_scope, is_deleted, deleted_at, deleted_by, updated_at, custom_fields, due_date, source_ticket_id, requester_department_id, requirement_reason, budget_impact, estimated_effort, estimated_cost, dependency_notes, start_date, expected_completion_date, actual_completion_date, requirement_type_id, business_criticality_id, business_value_id, project_id, sprint_id, release_version, owner_id, coordinator_id, tat_status, overdue_days, remaining_days, regulatory_mapping, requirement_details, requester_designation_id, intake_snapshot, put_to_use_date, delete_reason, delete_batch_id, amendment_version, revised_details, status:status_master(name:status_name, status_color, code:status_code), department:departments!requirements_department_id_fkey(name), priority:priority_master!requirements_priority_id_fkey(name:priority_name, priority_color), software_system:software_systems(name), module:software_modules(name), sub_module:software_submodules(name), category:ticket_categories(name), sub_category:ticket_subcategories(name), requester:user_master!requirements_requester_id_fkey(full_name), requirement_approval_flow(level, status)')
      .order('created_at', { ascending: false });
  console.log('Error:', error);
  console.log('Count:', data ? data.length : 0);
}
test();
