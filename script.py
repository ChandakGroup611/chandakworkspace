import re

with open('d:/adios/lib/actions/dashboardMetrics.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add updated_at to all select queries that have created_at
content = re.sub(r'id, created_at,', r'id, created_at, updated_at,', content)

# Modify user_master fetch to include role
content = content.replace(
    ".select('id, full_name')",
    ".select('id, full_name, role_id, roles(name)')"
)

# Update userMap logic
userMap_old = '''        if (usersData) {
          usersData.forEach((u: any) => {
            userMap[u.id] = u.full_name;
          });
        }'''
userMap_new = '''        if (usersData) {
          usersData.forEach((u: any) => {
            userMap[u.id] = {
              name: u.full_name,
              role: u.roles?.name || "Team Member"
            } as any;
          });
        }'''
content = content.replace(userMap_old, userMap_new)

# Update user mapping usages
content = content.replace('userMap[t.assigned_to] || userMap[t.created_by] || "Unassigned"', '(userMap[t.assigned_to]?.name || userMap[t.created_by]?.name || "Unassigned")')
content = content.replace('userMap[t.assignee_id] || userMap[t.creator_id] || "Unassigned"', '(userMap[t.assignee_id]?.name || userMap[t.creator_id]?.name || "Unassigned")')
content = content.replace('userMap[t.creator_id] || "Unassigned"', '(userMap[t.creator_id]?.name || "Unassigned")')

# We also need to add userRole and updatedAt to the items pushed to allItems.
# Let's do a more robust regex to insert userRole and updatedAt.
content = re.sub(r'createdAt: (t\.created_at),', r'createdAt: \1,\n        updatedAt: t.updated_at,\n        userRole: userMap[t.assigned_to]?.role || userMap[t.created_by]?.role || userMap[t.assignee_id]?.role || userMap[t.creator_id]?.role || "Team Member",', content)

with open('d:/adios/lib/actions/dashboardMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(content)
