const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

const regex = /revalidatePath\(`\/requirements\/\$\{reqId\}`\);\r?\n\}/;

content = content.replace(regex, `revalidatePath(\`/requirements/\${reqId}\`);
}

export async function fetchRequirements(workspaceId?: string | null) {
  // Use filter on custom_fields since workspace_id column doesn't exist natively on requirements yet
  const { data, error } = await supabaseAdmin
    .from('requirements')
    .select(\`
      *,
      status:status_master(name:status_name, status_color, code:status_code),
      department:departments!requirements_department_id_fkey(name),
      priority:priority_master!requirements_priority_id_fkey(name:priority_name, priority_color),
      software_system:software_systems(name),
      module:software_modules(name),
      sub_module:software_submodules(name),
      category:ticket_categories(name),
      sub_category:ticket_subcategories(name),
      creator:user_master!requirements_creator_id_fkey(full_name)
    \`)
    .contains('custom_fields', { workspace_id: workspaceId })
    .order('created_at', { ascending: false });

  if (error) {`);

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
