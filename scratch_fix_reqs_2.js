const fs = require('fs');

// 1. Fix requirements.ts
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// append fetchRequirement if it's not there
if (!content.includes('export async function fetchRequirement(')) {
  content += `\nexport async function fetchRequirement(reqId: string) {
  const { data, error } = await supabaseAdmin
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
    .eq('id', reqId)
    .single();

  if (error) {
    console.error('Error fetching requirement:', error);
    return null;
  }
  return data;
}\n`;
}

// Fix parameter type in fetchRequirements
content = content.replace('export async function fetchRequirements(workspaceId?: string | null) {', 'export async function fetchRequirements(workspaceId?: string | null | undefined) {');

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);

// 2. Fix app/requirements/page.tsx
let pageContent = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');
pageContent = pageContent.replace(/setMasters\(.*\);/g, ''); // Remove setMasters
fs.writeFileSync('d:/adios/app/requirements/page.tsx', pageContent);

console.log('Fixed!');
