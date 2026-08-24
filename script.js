const fs = require('fs');

let content = fs.readFileSync('d:/adios/lib/actions/dashboardMetrics.ts', 'utf8');

// Add updated_at to all select queries that have created_at
content = content.replace(/id, created_at,/g, 'id, created_at, updated_at,');

// Modify user_master fetch to include role
content = content.replace(
    ".select('id, full_name')",
    ".select('id, full_name, role_id, roles(name)')"
);

// Update userMap logic
const userMapOld = \        if (usersData) {
          usersData.forEach((u: any) => {
            userMap[u.id] = u.full_name;
          });
        }\;
const userMapNew = \        if (usersData) {
          usersData.forEach((u: any) => {
            userMap[u.id] = {
              name: u.full_name,
              role: u.roles?.name || "Team Member"
            } as any;
          });
        }\;
content = content.replace(userMapOld, userMapNew);

// Update user mapping usages
content = content.replace(/userMap\[t\.assigned_to\] \|\| userMap\[t\.created_by\] \|\| "Unassigned"/g, '(userMap[t.assigned_to]?.name || userMap[t.created_by]?.name || "Unassigned")');
content = content.replace(/userMap\[t\.assignee_id\] \|\| userMap\[t\.creator_id\] \|\| "Unassigned"/g, '(userMap[t.assignee_id]?.name || userMap[t.creator_id]?.name || "Unassigned")');
content = content.replace(/userMap\[t\.creator_id\] \|\| "Unassigned"/g, '(userMap[t.creator_id]?.name || "Unassigned")');

// We also need to add userRole and updatedAt to the items pushed to allItems.
content = content.replace(/createdAt: (t\.created_at),/g, 'createdAt: ,\n        updatedAt: t.updated_at,\n        userRole: userMap[t.assigned_to]?.role || userMap[t.created_by]?.role || userMap[t.assignee_id]?.role || userMap[t.creator_id]?.role || "Team Member",');

fs.writeFileSync('d:/adios/lib/actions/dashboardMetrics.ts', content, 'utf8');
