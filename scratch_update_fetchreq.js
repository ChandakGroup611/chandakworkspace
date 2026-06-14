const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

const newFetchRequirements = `export async function fetchRequirements(workspaceId?: string | null) {
  let query = supabaseAdmin
    .from('requirements')
    .select(\`
      *,
      status:status_master(name:status_name, status_color, code:status_code),
      department:departments!requirements_department_id_fkey(name),
      priority:priority_master!requirements_priority_id_fkey(name),
      software_system:software_systems!requirements_software_system_id_fkey(name),
      module:software_modules!requirements_module_id_fkey(name),
      sub_module:software_submodules!requirements_sub_module_id_fkey(name),
      category:ticket_categories!requirements_category_id_fkey(name),
      sub_category:ticket_subcategories!requirements_sub_category_id_fkey(name),
      requester:user_master!requirements_requester_id_fkey(full_name),
      requester_department:departments!requirements_requester_department_id_fkey(name)
    \`)
    .eq('is_deleted', false);

  if (workspaceId) {
    query = query.contains('custom_fields', { workspace_id: workspaceId });
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching requirements:", error);
    return [];
  }
  return data || [];
}`;

content = content.replace(/export async function fetchRequirements[\s\S]*?return data \|\| \[\];\n}/, newFetchRequirements);
fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
