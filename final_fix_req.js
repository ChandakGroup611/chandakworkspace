const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// Fix 1: Header import
if (!content.includes("dispatchNotification")) {
  content = content.replace(
    "import { logActivityEvent } from '@/lib/actions/tasks';",
    "import { logActivityEvent } from '@/lib/actions/tasks';\nimport { dispatchNotification } from '@/lib/actions/notifications';"
  );
}

// Fix 2: fetchRequirement priority_color
content = content.replace(
  'priority:priority_master!requirements_priority_id_fkey(name:priority_name)',
  'priority:priority_master!requirements_priority_id_fkey(name:priority_name, priority_color)'
);

// Fix 3 & 4 & 5: Rewrite fetchRequirements completely
const oldFetchReqsRegex = /export async function fetchRequirements\([\s\S]*?if \(error\) \{[\s\S]*?return \[\];\s*\}\s*return data \|\| \[\];\s*\}/;

const newFetchReqs = `export async function fetchRequirements(workspaceId?: string | null) {
  let query = supabaseAdmin
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
      requester:user_master!requirements_requester_id_fkey(full_name)
    \`)
    .order('created_at', { ascending: false });

  if (workspaceId) {
    query = query.contains('custom_fields', { workspace_id: workspaceId });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching requirements:", error);
    return [];
  }

  if (data && data.length > 0) {
    const creatorIds = [...new Set(data.map(d => d.creator_id).filter(Boolean))];
    if (creatorIds.length > 0) {
      const { data: users } = await supabaseAdmin.from('user_master').select('id, full_name').in('id', creatorIds);
      if (users) {
        const userMap = {};
        users.forEach(u => userMap[u.id] = u);
        data.forEach(d => {
          if (d.creator_id && userMap[d.creator_id]) {
            d.creator = userMap[d.creator_id];
          }
        });
      }
    }
  }

  return data || [];
}`;

content = content.replace(oldFetchReqsRegex, newFetchReqs);

// Fix 6: TS error for dispatchNotification catch
content = content.replace(/\.catch\(e => console\.error\("Failed to notify requester", e\)\);/g, '.catch((e: any) => console.error("Failed to notify requester", e));');

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
console.log("Fixed requirements.ts safely.");
