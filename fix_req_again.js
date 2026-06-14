const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// 1. Add priority_color to fetchRequirement
const fetchReqRegex = /priority:priority_master!requirements_priority_id_fkey\(name:priority_name\)/;
content = content.replace(fetchReqRegex, 'priority:priority_master!requirements_priority_id_fkey(name:priority_name, priority_color)');

// 2. Update fetchRequirements to fetch relations
const fetchReqsRegex = /export async function fetchRequirements\(workspaceId\?: string \| null\) \{[\s\S]*?\.contains\('custom_fields', \{ workspace_id: workspaceId \}\)/;

const newFetchReqs = `export async function fetchRequirements(workspaceId?: string | null) {
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
    .contains('custom_fields', { workspace_id: workspaceId })`;

content = content.replace(fetchReqsRegex, newFetchReqs);

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
console.log("Fixed requirements.ts");
